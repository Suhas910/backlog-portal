package com.college.backlog.config;

import com.college.backlog.model.User;
import com.college.backlog.model.UserRole;
import com.college.backlog.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // No fallback defaults: an unset env var leaves the password blank, and a
    // blank seed password skips the account rather than installing a guessable
    // default (old issue #1). Set these in the environment to provision the
    // initial accounts on a fresh database.
    @Value("${admin.password.principal:}")
    private String principalPassword;

    @Value("${admin.password.hod:}")
    private String hodPassword;

    @Value("${admin.password.office:}")
    private String officePassword;

    @Value("${admin.password.admin:}")
    private String adminPassword;

    @Override
    public void run(String... args) throws Exception {
        // Default accounts: created only when an explicit seed password is
        // supplied via env. Existing rows are never overwritten here.
        seedUser("principal", principalPassword, UserRole.PRINCIPAL);
        seedUser("hod", hodPassword, UserRole.HOD);
        seedUser("office", officePassword, UserRole.DEPT_OFFICE);
        seedUser("admin", adminPassword, UserRole.ADMIN);

        // One-time safety net: bcrypt any legacy plaintext password so login can
        // rely on bcrypt only (the plaintext fallback has been removed).
        migratePlaintextPasswords();
    }

    private void seedUser(String username, String password, UserRole role) {
        boolean hasPassword = password != null && !password.isBlank();
        User user = userRepository.findById(username).orElse(null);

        if (user == null) {
            if (!hasPassword) {
                // No env-supplied password — do NOT install a guessable default.
                log.warn("Skipping seed of '{}' account: no admin.password.{} configured. "
                        + "Set it in the environment to provision this account.",
                        username, role.name().toLowerCase());
                return;
            }
            user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            // Force the seeded password to be replaced on first login.
            user.setMustChangePassword(true);
            userRepository.save(user);
            return;
        }

        boolean dirty = false;
        if (user.getPassword() == null || user.getPassword().isBlank()) {
            // Account row exists but has no usable password. Repair it only when
            // an explicit seed password is configured — never with a default.
            if (!hasPassword) {
                log.warn("Account '{}' has no usable password and no admin.password.{} is "
                        + "configured to repair it; leaving it untouched.",
                        username, role.name().toLowerCase());
            } else {
                user.setPassword(passwordEncoder.encode(password));
                user.setMustChangePassword(true);
                if (user.getRole() == null) {
                    user.setRole(role);
                }
                dirty = true;
            }
        } else if (hasPassword && passwordEncoder.matches(password, user.getPassword())
                && !user.isMustChangePassword()) {
            // Existing account still sitting on the seeded password — arm the
            // forced change. Idempotent: once rotated, the password no longer
            // matches the seed, so this never re-triggers.
            user.setMustChangePassword(true);
            dirty = true;
        }
        if (dirty) {
            userRepository.save(user);
        }
    }

    private void migratePlaintextPasswords() {
        for (User user : userRepository.findAll()) {
            String pw = user.getPassword();
            if (pw != null && !pw.isBlank() && !isBcryptHash(pw)) {
                user.setPassword(passwordEncoder.encode(pw));
                userRepository.save(user);
            }
        }
    }

    private boolean isBcryptHash(String value) {
        return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
    }
}

