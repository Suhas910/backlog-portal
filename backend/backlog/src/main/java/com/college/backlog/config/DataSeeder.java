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

    @Override
    public void run(String... args) throws Exception {
        // Creates default accounts: Username, Password, Role
        createUserIfNotFound("principal", principalPassword, "PRINCIPAL");
        createUserIfNotFound("hod", hodPassword, "HOD");
        createUserIfNotFound("office", officePassword, "DEPT_OFFICE");
    }

    private void createUserIfNotFound(String username, String password, String role) {
        if (userRepository.findById(username).isEmpty()) {
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            userRepository.save(user);
        }
    }
}

