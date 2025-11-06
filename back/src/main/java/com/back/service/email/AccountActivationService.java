package com.back.service.email;


import com.back.model.entity.User;

public interface AccountActivationService {
    void createActivationToken(User user);
    void activateAccount(String email, String otp);
    void resendActivationToken(String email);
}
