package com.infy.lms.scheduler;

import com.infy.lms.model.BookWaitlist;
import com.infy.lms.repository.BookWaitlistRepository;
import com.infy.lms.service.WaitlistService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WaitlistScheduler {

    private final BookWaitlistRepository waitlistRepository;
    private final WaitlistService waitlistService;

    /**
     * Update waiting days and priority scores for all active waitlist entries
     * Runs every 6 hours to keep waitlist data fresh
     */
    @Scheduled(fixedRate = 21600000) // 6 hours in milliseconds
    @Transactional
    public void updateWaitingDaysAndPriorities() {
        try {
            log.info("🔄 Starting scheduled waitlist update...");

            // Get all active waitlist entries
            List<BookWaitlist> activeEntries = waitlistRepository.findByIsActiveTrue();

            if (activeEntries.isEmpty()) {
                log.info("No active waitlist entries to update");
                return;
            }

            int updatedCount = 0;
            for (BookWaitlist entry : activeEntries) {
                try {
                    // Update waiting days and recalculate priority
                    entry.updateWaitingDays();

                    // Recalculate priority score (this also updates waiting days)
                    waitlistService.calculateAndUpdatePriority(entry);

                    updatedCount++;
                } catch (Exception e) {
                    log.error("Failed to update waitlist entry {}: {}", entry.getId(), e.getMessage());
                }
            }

            // Save all updated entries
            waitlistRepository.saveAll(activeEntries);

            log.info("✅ Successfully updated {} active waitlist entries", updatedCount);

        } catch (Exception e) {
            log.error("Failed to update waitlist data", e);
        }
    }

    /**
     * Clean up stale priority data (entries not updated in the last 24 hours)
     * Runs daily at 3 AM
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupStalePriorities() {
        try {
            log.info("🧹 Starting cleanup of stale waitlist priorities...");

            Instant cutoffTime = Instant.now().minusSeconds(86400); // 24 hours ago
            List<BookWaitlist> staleEntries = waitlistRepository.findStaleWaitlistEntries(cutoffTime);

            if (staleEntries.isEmpty()) {
                log.info("No stale waitlist entries to update");
                return;
            }

            for (BookWaitlist entry : staleEntries) {
                try {
                    waitlistService.calculateAndUpdatePriority(entry);
                } catch (Exception e) {
                    log.error("Failed to update stale entry {}: {}", entry.getId(), e.getMessage());
                }
            }

            waitlistRepository.saveAll(staleEntries);
            log.info("✅ Updated {} stale waitlist entries", staleEntries.size());

        } catch (Exception e) {
            log.error("Failed to cleanup stale priorities", e);
        }
    }
}
