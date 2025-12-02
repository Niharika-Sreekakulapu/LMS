package com.infy.lms.service;

import com.infy.lms.exception.BadRequestException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;

@Service
public class FileStorageServiceImpl implements FileStorageService {

    private final Path uploadDir;

    public FileStorageServiceImpl() {
        this.uploadDir = Paths.get("uploads").toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadDir);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create upload directory", ex);
        }
    }

    @Override
    public String storeFile(MultipartFile file) {
        String original = StringUtils.cleanPath(file.getOriginalFilename());

        if (original.contains("..")) {
            throw new BadRequestException("Invalid file path");
        }

        try {
            String filename = System.currentTimeMillis() + "_" + original;
            Path target = this.uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return target.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file", e);
        }
    }
}
