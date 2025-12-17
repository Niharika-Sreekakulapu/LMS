package com.infy.lms.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentRequestDTO {
    private BigDecimal amount;
}
