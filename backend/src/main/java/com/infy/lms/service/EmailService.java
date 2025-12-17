package com.infy.lms.service;

public interface EmailService {

    void sendEmail(String to, String subject, String htmlBody);

    void sendEmailWithAttachment(String to, String subject, String htmlBody, String pathFromServer);
}
