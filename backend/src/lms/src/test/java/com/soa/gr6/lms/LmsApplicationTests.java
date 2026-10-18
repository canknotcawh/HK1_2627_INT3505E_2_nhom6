package com.soa.gr6.lms;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/** Needs Postgres (docker compose up -d postgres). Run with LMS_IT=true. */
@EnabledIfEnvironmentVariable(named = "LMS_IT", matches = "true")
@SpringBootTest
class LmsApplicationTests {

	@Test
	void contextLoads() {
	}

}
