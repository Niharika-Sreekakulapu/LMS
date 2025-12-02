package com.infy.lms.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.*;

class FileStorageServiceImplTest {

    private final Path uploads = Path.of("uploads");

    @AfterEach
    void cleanup() throws Exception {
        // delete files created during test in uploads dir
        if (Files.exists(uploads)) {
            Files.walk(uploads)
                    .sorted((a, b) -> b.compareTo(a)) // delete files before directories
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (Exception ignored) {}
                    });
        }
    }

    @Test
    void storeFile_writesFileToUploads_andReturnsPath() throws Exception {
        FileStorageServiceImpl svc = new FileStorageServiceImpl();

        MockMultipartFile file = new MockMultipartFile(
                "file", "hello-test.txt", "text/plain", "hello world".getBytes()
        );

        String stored = svc.storeFile(file);
        assertThat(stored).isNotBlank();

        Path p = Path.of(stored);
        assertThat(Files.exists(p)).isTrue();
        assertThat(Files.readAllBytes(p)).contains("hello world".getBytes());
    }
}
