package com.infy.lms.service;

import com.infy.lms.dto.RegistrationRequest;
import com.infy.lms.dto.UserSummaryDto;
import com.infy.lms.model.User;

public interface AuthService {

    void registerUser(RegistrationRequest request, String idProofPath);

    void createPasswordResetToken(String email);

    void resetPassword(String token, String newPassword);

    User approveUser(Long id);

    User rejectUser(Long id, String reason);

    java.util.List<UserSummaryDto> listAllUsers();

    UserSummaryDto getUserSummaryByEmail(String email);

    User getUserEntityByEmail(String email);

    User updateUserProfile(String email, java.util.Map<String, Object> updates);
}
