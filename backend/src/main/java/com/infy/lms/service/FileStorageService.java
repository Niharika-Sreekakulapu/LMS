package com.infy.lms.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * Store a file and return absolute path of stored file.
     */
    String storeFile(MultipartFile file);
}
