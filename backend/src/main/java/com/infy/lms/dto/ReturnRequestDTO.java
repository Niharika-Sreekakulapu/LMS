package com.infy.lms.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ReturnRequestDTO {

    @JsonAlias({"borrowRecordId","issueId"})
    private Long borrowRecordId;

    // optional, service converts LocalDate -> Instant internally
    private LocalDate returnDate;

    private boolean damaged = false;
    private boolean lost = false;

}
