package com.infy.lms.controller;

import com.infy.lms.dto.*;
import com.infy.lms.model.Issue;
import com.infy.lms.service.IssueService;
import com.infy.lms.repository.IssueRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/issues")
public class IssueController {

    private final IssueService issueService;
    private final IssueRepository issueRepository; // small helper for quick GETs

    @Autowired
    public IssueController(IssueService issueService, IssueRepository issueRepository) {
        this.issueService = issueService;
        this.issueRepository = issueRepository;
    }

    // Issue a book — librarians only
    @PreAuthorize("hasRole('LIBRARIAN')")
    @PostMapping
    public ResponseEntity<IssueResponse> createIssue(@RequestBody IssueRequest req) {
        IssueResponse resp = issueService.issueBook(req);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(resp.getIssueId())
                .toUri();
        return ResponseEntity.created(location).body(resp);
    }

    /**
     * Simple admin/test endpoint: list all issues (no paging). Remove or secure later.
     */
    @GetMapping
    public ResponseEntity<List<IssueResponse>> listAllIssues() {
        List<IssueResponse> list = issueRepository.findAll().stream().map(i -> {
            IssueResponse r = new IssueResponse();
            r.setIssueId(i.getId());
            r.setBookId(i.getBook().getId());
            r.setUserId(i.getUser().getId());
            r.setIssueDate(i.getIssueDate());
            r.setDueDate(i.getDueDate());
            r.setStatus(i.getStatus());
            return r;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // Return a book — librarians only
    @PreAuthorize("hasRole('LIBRARIAN')")
    @PostMapping("/return")
    public ResponseEntity<ReturnResponse> returnBook(@Valid @RequestBody ReturnRequest req) {
        ReturnResponse resp = issueService.returnBook(req);
        return ResponseEntity.ok(resp);
    }

    // Member history — librarians only (or see next section if you want members to view themselves)
    @PreAuthorize("hasRole('LIBRARIAN') or @securityService.isCurrentUser(authentication, #memberId)")
    @GetMapping("/members/{memberId}/history")
    public ResponseEntity<List<IssueHistoryItem>> getMemberHistory(@PathVariable Long memberId) {
        List<IssueHistoryItem> list = issueService.getHistoryForMember(memberId);
        return ResponseEntity.ok(list);
    }

}
