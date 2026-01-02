package com.infy.lms.service;

import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailServiceImplTest {

    @Test
    void sendEmail_callsMailSender() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        // create a real MimeMessage (safe) for helper usage
        MimeMessage msg = new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null);
        when(mailSender.createMimeMessage()).thenReturn(msg);

        EmailServiceImpl svc = new EmailServiceImpl(mailSender);

        svc.sendEmail("to@example.com", "Subject", "<p>Hi</p>");

        verify(mailSender, times(1)).send(msg);
    }

    @Test
    void sendEmailWithAttachment_callsSend() throws Exception {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        MimeMessage msg = new jakarta.mail.internet.MimeMessage((jakarta.mail.Session) null);
        when(mailSender.createMimeMessage()).thenReturn(msg);

        EmailServiceImpl svc = new EmailServiceImpl(mailSender);

        // create a temporary small file to attach
        java.nio.file.Path tmp = java.nio.file.Files.createTempFile("email-attach", ".txt");
        java.nio.file.Files.writeString(tmp, "attach");

        svc.sendEmailWithAttachment("to@example.com", "Sub", "<p>body</p>", tmp.toString());

        verify(mailSender, times(1)).send(msg);

        // cleanup
        java.nio.file.Files.deleteIfExists(tmp);
    }
}
