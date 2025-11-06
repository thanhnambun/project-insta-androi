//package com.back.utils.otp;
//
//import com.ra.base_spring_boot.model.entity.Account;
//import com.ra.base_spring_boot.model.enums.AccountStatus;
//import com.ra.base_spring_boot.repository.account.AccountRepo;
//import com.ra.base_spring_boot.repository.account.ActivationTokenRepo;
//import jakarta.transaction.Transactional;
//import lombok.RequiredArgsConstructor;
//import org.springframework.scheduling.annotation.Scheduled;
//import org.springframework.stereotype.Service;
//
//import java.time.LocalDateTime;
//import java.util.List;
//
//@Service
//@RequiredArgsConstructor
//public class InactiveAccountCleanupJob {
//    private final ActivationTokenRepo activationTokenRepo;
//    private final AccountRepo accountRepo;
//
//    @Transactional
//    @Scheduled(cron = "0 0 0 */2 * ?", zone = "Asia/Ho_Chi_Minh")
//    public void cleanupInactiveAccounts() {
//        LocalDateTime threshold = LocalDateTime.now().minusDays(2);
//
//        List<Account> accounts = accountRepo.findByStatusAndCreatedAtBefore(
//                AccountStatus.NOT_ACTIVATED, threshold
//        );
//        if (accounts.isEmpty()) return;
//
//        // Xóa token trước
//        activationTokenRepo.deleteByAccountIn(accounts);
//
//        // Sau đó mới xóa account
//        accountRepo.deleteAllInBatch(accounts);
//    }
//
//}
//
