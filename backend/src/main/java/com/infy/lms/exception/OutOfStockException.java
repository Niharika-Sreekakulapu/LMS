package com.infy.lms.exception;
public class OutOfStockException extends RuntimeException {
    public OutOfStockException(String msg){ super(msg); }
}