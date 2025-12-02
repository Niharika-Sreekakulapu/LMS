package com.infy.lms.service;

import com.infy.lms.dto.*;

import java.util.List;

public interface IssueService {

    IssueResponse issueBook(IssueRequest request);

    ReturnResponse returnBook(ReturnRequest request);

    List<IssueHistoryItem> getHistoryForMember(Long memberId);


}
