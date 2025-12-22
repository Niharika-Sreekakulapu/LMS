package com.infy.lms.scheduler;

import com.infy.lms.service.BorrowService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OverdueScheduler {

    private static final Logger log = LoggerFactory.getLogger(OverdueScheduler.class);
    private final BorrowService borrowService;

    /**
     * Runs once daily at 02:00 AM server time and reconciles overdue borrows.
     * Cron uses Spring's format: second minute hour day-of-month month day-of-week
     * Adjust schedule as needed.
     */
    @Scheduled(cron = "0 0 2 * * *")
    public void dailyReconcile() {
        log.info("Starting daily overdue reconciliation...");
        try {
            borrowService.reconcileOverdues();
            log.info("Daily overdue reconciliation finished.");
        } catch (Exception ex) {
            log.error("Error during overdue reconciliation", ex);
        }
    }

    /**
     * Runs once daily at 09:00 AM server time and sends due date alerts for books due in 2 days.
     */
    @Scheduled(cron = "0 0 9 * * *")
    public void sendDueDateAlerts() {
        log.info("Starting daily due date alert notifications...");
        try {
            borrowService.sendDueDateAlerts();
            log.info("Daily due date alert notifications finished.");
        } catch (Exception ex) {
            log.error("Error during due date alert notifications", ex);
        }
    }
}
