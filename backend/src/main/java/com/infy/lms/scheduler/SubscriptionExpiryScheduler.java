package com.infy.lms.scheduler;

import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import com.infy.lms.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SubscriptionExpiryScheduler {

    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    /**
     * Check for expired subscriptions every 24 hours at 2 AM
     * Cron: "0 0 2 * * ?" means at 02:00:00 every day
     */
    @Scheduled(cron = "0 0 2 * * ?")
    public void checkForExpiredSubscriptions() {
        System.out.println("Checking for expired subscriptions...");

        // Find users who have active premium subscriptions
        List<User> premiumUsers = userRepository.findByMembershipType(User.MembershipType.PREMIUM);

        Instant now = Instant.now();
        int expiredCount = 0;

        for (User user : premiumUsers) {
            // Check if subscription has expired
            if (user.getSubscriptionEnd() != null && user.getSubscriptionEnd().isBefore(now)) {
                System.out.println("Expiring subscription for user " + user.getId() +
                                 " (package: " + user.getSubscriptionPackage() +
                                 ", expired: " + user.getSubscriptionEnd() + ")");

                // Expire the subscription
                subscriptionService.expireSubscription(user);
                expiredCount++;
            }
        }

        if (expiredCount > 0) {
            System.out.println("Expired " + expiredCount + " subscription(s)");
        } else {
            System.out.println("No expired subscriptions found");
        }
    }

    /**
     * Also check for subscriptions that are about to expire (7 days notice)
     * Run every day at 9 AM
     */
    @Scheduled(cron = "0 0 9 * * ?")
    public void checkForSubscriptionsAboutToExpire() {
        System.out.println("Checking for subscriptions about to expire...");

        List<User> premiumUsers = userRepository.findByMembershipType(User.MembershipType.PREMIUM);

        Instant now = Instant.now();
        Instant sevenDaysFromNow = now.plus(java.time.Duration.ofDays(7));

        int aboutToExpireCount = 0;

        for (User user : premiumUsers) {
            if (user.getSubscriptionEnd() != null &&
                user.getSubscriptionEnd().isAfter(now) &&
                user.getSubscriptionEnd().isBefore(sevenDaysFromNow)) {

                System.out.println("Subscription for user " + user.getId() +
                                 " expires soon: " + user.getSubscriptionEnd());
                aboutToExpireCount++;
                // Could add email notification here for upcoming expiry
            }
        }

        if (aboutToExpireCount > 0) {
            System.out.println("Found " + aboutToExpireCount + " subscription(s) expiring in 7 days");
        }
    }
}
