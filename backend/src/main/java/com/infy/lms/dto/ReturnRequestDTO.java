package com.infy.lms.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReturnRequestDTO {

    @JsonAlias({"borrowRecordId","issueId"})
    @JsonProperty("borrowRecordId")
    private Long borrowRecordId;

    // optional, service converts LocalDate -> Instant internally
    @JsonProperty("returnDate")
    private LocalDate returnDate;

    @JsonProperty("damaged")
    private boolean damaged = false;

    @JsonProperty("lost")
    private boolean lost = false;

    // Explicit setters for boolean fields
    public void setDamaged(boolean damaged) {
        this.damaged = damaged;
    }

    public void setLost(boolean lost) {
        this.lost = lost;
    }

}
