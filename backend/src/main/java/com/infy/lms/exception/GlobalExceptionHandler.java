package com.infy.lms.exception;

import com.infy.lms.dto.ApiError;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ---------------- Custom Exceptions ----------------

    @ExceptionHandler(OutOfStockException.class)
    public ResponseEntity<ApiError> handleOutOfStock(OutOfStockException ex) {
        ApiError err = new ApiError(HttpStatus.CONFLICT.value(), "Out of stock", ex.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(err);
    }

    @ExceptionHandler(BorrowException.class)
    public ResponseEntity<ApiError> handleBorrowException(BorrowException ex) {
        ApiError err = new ApiError(HttpStatus.BAD_REQUEST.value(), "Borrow error", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(NotFoundException ex) {
        ApiError err = new ApiError(HttpStatus.NOT_FOUND.value(), "Not found", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(err);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> handleBadRequest(BadRequestException ex) {
        ApiError err = new ApiError(HttpStatus.BAD_REQUEST.value(), "Bad request", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err);
    }

    @ExceptionHandler(DuplicatesIsbnException.class)
    protected ResponseEntity<Object> handleDuplicateIsbn(DuplicatesIsbnException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    protected ResponseEntity<Object> handleIllegalState(IllegalStateException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }


    @ExceptionHandler(UnauthorizedException.class)
    protected ResponseEntity<Object> handleUnauthorized(UnauthorizedException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(ConflictException.class)
    protected ResponseEntity<Object> handleConflict(ConflictException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(ResourceAlreadyExistsException.class)
    protected ResponseEntity<Object> handleResourceAlreadyExists(ResourceAlreadyExistsException ex) {
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(InternalServerErrorException.class)
    protected ResponseEntity<Object> handleInternalServer(InternalServerErrorException ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage());
    }

    @ExceptionHandler(BookNotFoundException.class)
    public ResponseEntity<Object> handleNotFound(BookNotFoundException ex) {
        Map<String,Object> body = Map.of(
                "timestamp", Instant.now().toString(),
                "status", HttpStatus.NOT_FOUND.value(),
                "error", "Not Found",
                "message", ex.getMessage()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
    }


    // ---------------- Spring / common exceptions ----------------

    @ExceptionHandler(AuthenticationException.class)
    protected ResponseEntity<Object> handleAuthenticationException(AuthenticationException ex) {
        log.debug("Authentication failed: {}", ex.getMessage());
        return buildResponse(HttpStatus.UNAUTHORIZED, "Authentication failed");
    }

    @ExceptionHandler(AccessDeniedException.class)
    protected ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex) {
        log.debug("Access denied: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, "Access denied");
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    protected ResponseEntity<Object> handleOptimisticLock(OptimisticLockingFailureException ex) {
        log.warn("Optimistic locking failure: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "Concurrent update conflict. Please retry.");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    protected ResponseEntity<Object> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation: {}", ex.getMessage());
        String msg = "Database constraint violation";
        Throwable rc = ex.getRootCause();
        if (rc != null && rc.getMessage() != null) {
            msg = rc.getMessage();
        }
        return buildResponse(HttpStatus.CONFLICT, msg);
    }


    @Override
    protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(
            org.springframework.web.HttpRequestMethodNotSupportedException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        StringBuilder message = new StringBuilder();
        message.append(ex.getMethod());
        message.append(" method is not supported for this endpoint. Supported methods: ");

        if (ex.getSupportedHttpMethods() != null) {
            message.append(
                    ex.getSupportedHttpMethods()
                            .stream()
                            .map(Object::toString)
                            .collect(java.util.stream.Collectors.joining(", "))
            );
        }

        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, message.toString());
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            org.springframework.http.converter.HttpMessageNotReadableException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        String msg = "Malformed JSON request or invalid field types";
        // If you want more detail in dev, you can append ex.getMostSpecificCause().getMessage()
        return buildResponse(HttpStatus.BAD_REQUEST, msg);
    }



    // --------------- Fallback Exception -----------------

    @ExceptionHandler(Exception.class)
    protected ResponseEntity<Object> handleAll(Exception ex) {
        ex.printStackTrace(); // TEMP: prints full stack trace to console
        log.error("Unhandled exception caught", ex); // log full exception with stack
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }




    // --------------- Validation Errors ------------------

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request) {

        String details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(field -> field.getField() + ": " + (field.getDefaultMessage() != null ? field.getDefaultMessage() : "invalid"))
                .collect(Collectors.joining("; "));

        return buildResponse((HttpStatus) status, "Validation failed: " + details);
    }

    // --------------- Common Response Builder ------------

    private ResponseEntity<Object> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);

        return new ResponseEntity<>(body, status);
    }
}
