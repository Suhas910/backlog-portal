package com.college.backlog.config;

import com.college.backlog.model.User;
import com.college.backlog.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${admin.password.principal:principal123}")
    private String principalPassword;

    @Value("${admin.password.hod:hod123}")
    private String hodPassword;

    @Value("${admin.password.office:office123}")
    private String officePassword;

    @Value("${admin.password.admin:admin123}")
    private String adminPassword;

    @Override
    public void run(String... args) throws Exception {
        // Default accounts: created if missing, and repaired if the row exists
        // without a usable password (e.g. inserted by hand without one).
        seedUser("principal", principalPassword, "PRINCIPAL");
        seedUser("hod", hodPassword, "HOD");
        seedUser("office", officePassword, "DEPT_OFFICE");
        seedUser("admin", adminPassword, "ADMIN");

        // One-time safety net: bcrypt any legacy plaintext password so login can
        // rely on bcrypt only (the plaintext fallback has been removed).
        migratePlaintextPasswords();
    }

    private void seedUser(String username, String password, String role) {
        User user = userRepository.findById(username).orElse(null);
        if (user == null) {
            user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            userRepository.save(user);
        } else if (user.getPassword() == null || user.getPassword().isBlank()) {
            // account row exists but has no usable password — set the default
            user.setPassword(passwordEncoder.encode(password));
            if (user.getRole() == null || user.getRole().isBlank()) {
                user.setRole(role);
            }
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

