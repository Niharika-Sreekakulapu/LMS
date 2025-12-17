package com.infy.lms;

import com.infy.lms.config.TestMailConfig;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest
@Import(TestMailConfig.class)
public class LmsApplicationTests {

	@Test
	void contextLoads() {
	}

}
