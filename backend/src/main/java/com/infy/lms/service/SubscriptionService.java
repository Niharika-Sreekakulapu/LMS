package com.infy.lms.service;

import com.infy.lms.model.User;
import com.infy.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final UserRepository userRepository;
    private final EmailService emailService;

    @Transactional
    public User activateSubscription(Long userId, User.MembershipPackage membershipPackage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Calculate subscription period
        Instant subscriptionStart = Instant.now();
        Instant subscriptionEnd = calculateSubscriptionEnd(subscriptionStart, membershipPackage);

        // Update user subscription details
        user.setMembershipType(User.MembershipType.PREMIUM);
        user.setSubscriptionPackage(membershipPackage);
        user.setSubscriptionStart(subscriptionStart);
        user.setSubscriptionEnd(subscriptionEnd);

        User savedUser = userRepository.save(user);

        // Send activation email
        sendSubscriptionActivationEmail(savedUser, membershipPackage, subscriptionEnd);

        return savedUser;
    }

    @Transactional
    public User extendSubscription(Long userId, User.MembershipPackage extensionPackage) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Check if user has an active premium subscription
        if (user.getMembershipType() != User.MembershipType.PREMIUM) {
            throw new IllegalArgumentException("User does not have an active premium subscription");
        }

        // Check if subscription is expired
        Instant now = Instant.now();
        Instant newStartDate = now;
        if (user.getSubscriptionEnd() != null && user.getSubscriptionEnd().isAfter(now)) {
            // Extend from current end date
            newStartDate = user.getSubscriptionEnd();
        }

        // Calculate new end date based on extension package
        Instant newEndDate = calculateSubscriptionEnd(newStartDate, extensionPackage);

        // Update subscription details
        user.setSubscriptionEnd(newEndDate);

        User savedUser = userRepository.save(user);

        // Send extension confirmation email
        sendSubscriptionExtensionEmail(savedUser, extensionPackage, newEndDate);

        return savedUser;
    }

    public void expireSubscription(User user) {
        // Revert membership to NORMAL
        user.setMembershipType(User.MembershipType.NORMAL);
        user.setSubscriptionPackage(null);
        user.setSubscriptionStart(null);
        user.setSubscriptionEnd(null);

        userRepository.save(user);

        // Send expiry notification email
        sendSubscriptionExpiryEmail(user);
    }

    private Instant calculateSubscriptionEnd(Instant start, User.MembershipPackage membershipPackage) {
        int durationMonths = membershipPackage.getDurationMonths();
        // Convert to LocalDateTime, add months, then convert back to Instant
        return java.time.LocalDateTime.ofInstant(start, ZoneId.systemDefault())
            .plusMonths(durationMonths)
            .atZone(ZoneId.systemDefault())
            .toInstant();
    }

    public boolean isUserPremium(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || user.getMembershipType() != User.MembershipType.PREMIUM) {
            return false;
        }

        // Check if subscription is still active
        Instant now = Instant.now();
        return user.getSubscriptionEnd() != null && user.getSubscriptionEnd().isAfter(now);
    }

    public User.MembershipType getEffectiveMembershipType(Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return User.MembershipType.NORMAL;
        }

        if (user.getMembershipType() == User.MembershipType.PREMIUM) {
            Instant now = Instant.now();
            // Check if subscription has expired
            if (user.getSubscriptionEnd() != null && user.getSubscriptionEnd().isAfter(now)) {
                return User.MembershipType.PREMIUM;
            } else {
                // Auto-expire expired subscription
                expireSubscription(user);
                return User.MembershipType.NORMAL;
            }
        }

        return user.getMembershipType();
    }

    private void sendSubscriptionActivationEmail(User user, User.MembershipPackage membershipPackage, Instant subscriptionEnd) {
        try {
            String to = user.getEmail();
            String subject = "Premium Subscription Activated - Welcome to Library Premium!";

            // Format subscription end date nicely
            String endDateStr = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                .format(java.time.LocalDateTime.ofInstant(subscriptionEnd, ZoneId.systemDefault()));

            String htmlBody = String.format(
                "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset='UTF-8'>\n" +
                "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
                "    <title>Premium Subscription Activated</title>\n" +
                "    <style>\n" +
                "        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }\n" +
                "        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }\n" +
                "        .header { background: linear-gradient(135deg, #FFD700, #FFA500); color: white; padding: 40px 20px; text-align: center; }\n" +
                "        .content { padding: 40px 30px; }\n" +
                "        .subscription-card { background: #f8f9fa; border-left: 5px solid #FFD700; padding: 20px; margin: 25px 0; border-radius: 8px; }\n" +
                "        .benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }\n" +
                "        .benefit-item { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; }\n" +
                "        .button { display: inline-block; padding: 14px 28px; background: linear-gradient(145deg, #FFD700, #FFA500); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(255,215,0,0.3); margin: 20px 0; }\n" +
                "        .footer { background: #2c3e50; color: white; padding: 25px; text-align: center; }\n" +
                "        h1 { margin: 0 0 10px 0; font-size: 32px; }\n" +
                "        h2 { color: #FFD700; margin: 30px 0 20px 0; }\n" +
                "        h3 { color: #2c3e50; margin: 0 0 15px 0; }\n" +
                "        p { color: #555; line-height: 1.6; font-size: 16px; }\n" +
                "        .highlight { color: #FFA500; font-weight: 600; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class='container'>\n" +
                "        <div class='header'>\n" +
                "            <h1>🎉 Premium Activated!</h1>\n" +
                "            <p>Welcome to Library Premium Membership</p>\n" +
                "        </div>\n" +
                "\n" +
                "        <div class='content'>\n" +
                "            <p>Hello <span class='highlight'>%s</span>,</p>\n" +
                "\n" +
                "            <p>Thank you for upgrading to our <strong>Premium Membership</strong>! Your subscription has been successfully activated and your benefits are now unlocked.</p>\n" +
                "\n" +
                "            <div class='subscription-card'>\n" +
                "                <h3>📋 Subscription Details</h3>\n" +
                "                <p><strong>Package:</strong> %s</p>\n" +
                "                <p><strong>Duration:</strong> %d months</p>\n" +
                "                <p><strong>Amount Paid:</strong> ₹%d</p>\n" +
                "                <p><strong>Valid Until:</strong> %s</p>\n" +
                "            </div>\n" +
                "\n" +
                "            <h2>🌟 Your Premium Benefits</h2>\n" +
                "            <div class='benefits-grid'>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>📚</span>\n" +
                "                    <div><strong>Unlimited Requests</strong><br><small>No monthly limits</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>💎</span>\n" +
                "                    <div><strong>Premium Books</strong><br><small>Exclusive access</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>⚡</span>\n" +
                "                    <div><strong>Priority Processing</strong><br><small>Fast approval</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>⏰</span>\n" +
                "                    <div><strong>Extended Periods</strong><br><small>Extra borrowing time</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>📖</span>\n" +
                "                    <div><strong>New Arrivals</strong><br><small>Advance notice</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>🎯</span>\n" +
                "                    <div><strong>Special Events</strong><br><small>VIP access</small></div>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "\n" +
                "            <p>Start exploring your premium benefits right now! Visit your library dashboard to access premium books and enjoy unlimited requests.</p>\n" +
                "\n" +
                "            <div style='text-align: center; margin: 30px 0;'>\n" +
                "                <a href='http://localhost:3000/books' class='button'>Explore Premium Books →</a>\n" +
                "            </div>\n" +
                "\n" +
                "            <p style='color: #666; font-size: 14px;'>\n" +
                "                <em>Your subscription will automatically expire on %s. You can renew anytime before expiration to continue enjoying all premium benefits.</em>\n" +
                "            </p>\n" +
                "\n" +
                "            <p style='color: #2c3e50; font-weight: 600;'>Happy Reading! 📖✨</p>\n" +
                "\n" +
                "        </div>\n" +
                "\n" +
                "        <div class='footer'>\n" +
                "            <p><strong>Library Management System</strong></p>\n" +
                "            <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>\n" +
                "            <p>© 2025 Library Management System. All rights reserved.</p>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>",
                user.getName() != null ? user.getName() : "Valued Member",
                membershipPackage.name().replace("_", " "),
                membershipPackage.getDurationMonths(),
                membershipPackage.getPrice(),
                endDateStr,
                endDateStr
            );

            emailService.sendEmail(to, subject, htmlBody);
        } catch (Exception e) {
            System.err.println("Failed to send subscription activation email to user " + user.getId() + ": " + e.getMessage());
        }
    }

    private void sendSubscriptionExtensionEmail(User user, User.MembershipPackage extensionPackage, Instant newEndDate) {
        try {
            String to = user.getEmail();
            String subject = "Premium Subscription Extended - Your Membership Has Been Renewed!";

            // Format new end date nicely
            String endDateStr = java.time.format.DateTimeFormatter.ofPattern("MMMM dd, yyyy")
                .format(java.time.LocalDateTime.ofInstant(newEndDate, ZoneId.systemDefault()));

            String htmlBody = String.format(
                "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "    <meta charset='UTF-8'>\n" +
                "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n" +
                "    <title>Premium Subscription Extended</title>\n" +
                "    <style>\n" +
                "        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f9f9f9; }\n" +
                "        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }\n" +
                "        .header { background: linear-gradient(135deg, #FFD700, #FFA500); color: white; padding: 40px 20px; text-align: center; }\n" +
                "        .content { padding: 40px 30px; }\n" +
                "        .extension-card { background: #f8f9fa; border-left: 5px solid #FFD700; padding: 20px; margin: 25px 0; border-radius: 8px; }\n" +
                "        .benefits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0; }\n" +
                "        .benefit-item { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 10px; }\n" +
                "        .button { display: inline-block; padding: 14px 28px; background: linear-gradient(145deg, #FFD700, #FFA500); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; box-shadow: 0 4px 15px rgba(255,215,0,0.3); margin: 20px 0; }\n" +
                "        .footer { background: #2c3e50; color: white; padding: 25px; text-align: center; }\n" +
                "        h1 { margin: 0 0 10px 0; font-size: 32px; }\n" +
                "        h2 { color: #FFD700; margin: 30px 0 20px 0; }\n" +
                "        h3 { color: #2c3e50; margin: 0 0 15px 0; }\n" +
                "        p { color: #555; line-height: 1.6; font-size: 16px; }\n" +
                "        .highlight { color: #FFA500; font-weight: 600; }\n" +
                "    </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "    <div class='container'>\n" +
                "        <div class='header'>\n" +
                "            <h1>🔄 Subscription Extended!</h1>\n" +
                "            <p>Your Premium Membership Has Been Renewed</p>\n" +
                "        </div>\n" +
                "\n" +
                "        <div class='content'>\n" +
                "            <p>Hello <span class='highlight'>%s</span>,</p>\n" +
                "\n" +
                "            <p>Great news! Your <strong>Premium Membership</strong> has been successfully extended. You can continue enjoying all your premium benefits without interruption.</p>\n" +
                "\n" +
                "            <div class='extension-card'>\n" +
                "                <h3>📋 Extension Details</h3>\n" +
                "                <p><strong>Extension Package:</strong> %s</p>\n" +
                "                <p><strong>Duration Added:</strong> %d months</p>\n" +
                "                <p><strong>Amount Paid:</strong> ₹%d</p>\n" +
                "                <p><strong>New Valid Until:</strong> %s</p>\n" +
                "            </div>\n" +
                "\n" +
                "            <h2>🌟 Your Premium Benefits Continue</h2>\n" +
                "            <div class='benefits-grid'>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>📚</span>\n" +
                "                    <div><strong>Unlimited Requests</strong><br><small>No monthly limits</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>💎</span>\n" +
                "                    <div><strong>Premium Books</strong><br><small>Exclusive access</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>⚡</span>\n" +
                "                    <div><strong>Priority Processing</strong><br><small>Fast approval</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>⏰</span>\n" +
                "                    <div><strong>Extended Periods</strong><br><small>Extra borrowing time</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>📖</span>\n" +
                "                    <div><strong>New Arrivals</strong><br><small>Advance notice</small></div>\n" +
                "                </div>\n" +
                "                <div class='benefit-item'>\n" +
                "                    <span style='font-size: 24px;'>🎯</span>\n" +
                "                    <div><strong>Special Events</strong><br><small>VIP access</small></div>\n" +
                "                </div>\n" +
                "            </div>\n" +
                "\n" +
                "            <p>Thank you for continuing your premium journey with us! Your support helps us maintain and improve our library services.</p>\n" +
                "\n" +
                "            <div style='text-align: center; margin: 30px 0;'>\n" +
                "                <a href='http://localhost:3000/books' class='button'>Continue Exploring →</a>\n" +
                "            </div>\n" +
                "\n" +
                "            <p style='color: #2c3e50; font-weight: 600;'>Happy Reading! 📖✨</p>\n" +
                "\n" +
                "        </div>\n" +
                "\n" +
                "        <div class='footer'>\n" +
                "            <p><strong>Library Management System</strong></p>\n" +
                "            <p>Contact us at support@lms.edu | Visit us at library@lms.edu</p>\n" +
                "            <p>© 2025 Library Management System. All rights reserved.</p>\n" +
                "        </div>\n" +
                "    </div>\n" +
                "</body>\n" +
                "</html>",
                user.getName() != null ? user.getName() : "Valued Member",
                extensionPackage.name().replace("_", " "),
                extensionPackage.getDurationMonths(),
                extensionPackage.getPrice(),
                endDateStr
            );

            emailService.sendEmail(to, subject, htmlBody);
        } catch (Exception e) {
            System.err.println("Failed to send subscription extension email to user " + user.getId() + ": " + e.getMessage());
        }
    }

    private void sendSubscriptionExpiryEmail(User user) {
        try {
            String to = user.getEmail();
            String subject = "Premium Subscription Expired - Library Membership Update";
            String body = String.format(
                "Dear %s,\n\n" +
                "Your premium subscription has expired.\n\n" +
                "Your membership type has been restored to NORMAL status.\n\n" +
                "Benefits no longer available:\n" +
                "• Unlimited book requests\n" +
                "• Premium books access\n" +
                "• Priority processing\n\n" +
                "You can renew your premium subscription anytime from your membership dashboard.\n\n" +
                "Thank you for using Library Premium!\n\n" +
                "Regards,\n" +
                "Library Management Team",
                user.getName() != null ? user.getName() : ""
            );

            emailService.sendEmail(to, subject, body);
        } catch (Exception e) {
            System.err.println("Failed to send subscription expiry email to user " + user.getId() + ": " + e.getMessage());
        }
    }
}
