package com.infy.lms.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class RecommendationScheduler {

    private final RecommendationService recommendationService;

    // Weekly job: run every Monday at 02:00 UTC
    @Scheduled(cron = "0 0 2 * * MON")
    public void generateWeeklyAcquisitionSuggestions() {
        try {
            // Use last 90 days as window for demand
            java.time.Instant end = java.time.Instant.now();
            java.time.Instant start = LocalDate.now().minusDays(90).atStartOfDay().toInstant(ZoneOffset.UTC);

            Map<String, Integer> popular = recommendationService.getFrequentlyRecommendedBooks(start, end, null, null, null);

            if (popular == null || popular.isEmpty()) {
                log.info("Weekly acquisition suggestions: no popular books found in window");
                return;
            }

            File dir = new File("reports");
            if (!dir.exists()) dir.mkdirs();
            String filename = "reports/acquisition_suggestions_" + LocalDate.now().toString() + ".csv";

            StringBuilder csv = new StringBuilder();
            csv.append("Title,Count\n");
            for (Map.Entry<String, Integer> e : popular.entrySet()) {
                csv.append('"').append(e.getKey().replaceAll("\"", "\"\"" )).append('"').append(',').append(e.getValue()).append("\n");
            }

            try (FileOutputStream fos = new FileOutputStream(filename)) {
                fos.write(csv.toString().getBytes(StandardCharsets.UTF_8));
            }

            log.info("Generated weekly acquisition suggestions: {}", filename);
        } catch (Exception ex) {
            log.error("Failed to generate acquisition suggestions", ex);
        }
    }
}