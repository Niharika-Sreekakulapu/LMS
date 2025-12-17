package com.infy.lms.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class BookAvailabilityDTO {
    private Integer availableCopies;
    private Integer issuedCopies;
}
