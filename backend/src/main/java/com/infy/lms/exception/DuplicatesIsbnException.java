package com.infy.lms.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicatesIsbnException extends RuntimeException {
    public DuplicatesIsbnException() { super(); }
    public DuplicatesIsbnException(String message) { super(message); }
    public DuplicatesIsbnException(String message, Throwable t) { super(message, t); }
}
