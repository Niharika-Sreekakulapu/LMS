package com.infy.lms.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from:#{null}}")
    private String fromAddress;

    @Value("${app.mail.from-name:#{null}}")
    private String fromName;

    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendEmail(String to, String subject, String htmlBody) {
        // Send emails asynchronously to avoid blocking request threads or transactions
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                logger.info("Sending email to: {}, subject: {}", to, subject);

                MimeMessage msg = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(msg, false, "UTF-8");

                if (fromAddress != null && !fromAddress.isBlank()) {
                    helper.setFrom(fromAddress, fromName == null ? null : fromName);
                }

                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText(htmlBody, true); // HTML enabled

                mailSender.send(msg);

                logger.info("Email sent successfully to: {}", to);

            } catch (Exception e) {
                logger.error("Failed to send email to: {}, subject: {}", to, subject, e);
                // do not rethrow - logging only so email failures don't affect workflow
            }
        });
    }

    @Override
    public void sendEmailWithAttachment(String to, String subject, String htmlBody, String pathFromServer) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");

            if (fromAddress != null && !fromAddress.isBlank()) {
                helper.setFrom(fromAddress, fromName == null ? null : fromName);
            }

            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            if (pathFromServer != null && !pathFromServer.isBlank()) {
                File file = new File(pathFromServer);
                if (file.exists() && file.isFile()) {
                    FileSystemResource fr = new FileSystemResource(file);
                    helper.addAttachment(file.getName(), fr);
                }
            }

            mailSender.send(msg);

        } catch (MessagingException me) {
            me.printStackTrace();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
