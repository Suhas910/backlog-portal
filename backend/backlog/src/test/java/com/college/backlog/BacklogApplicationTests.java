package com.college.backlog;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Boots the full Spring context against a LOCAL throwaway Postgres (never prod —
 * the "test" profile in src/test/resources/application-test.properties points the
 * datasource at localhost). On startup Flyway builds the schema from V1__baseline.sql
 * on the empty database, then Hibernate `ddl-auto=validate` asserts it matches the
 * entities — so this test proves a fresh Flyway-built schema and the code agree.
 *
 * Requires a Postgres reachable at the test datasource. Locally, start one with:
 *   docker run -d --name backlog-test -e POSTGRES_USER=verify -e POSTGRES_PASSWORD=verify \
 *     -e POSTGRES_DB=backlog -p 5433:5432 postgres:18
 * (CI provides a Postgres service.) Not run by the targeted unit-test runs.
 */
@SpringBootTest
@ActiveProfiles("test")
class BacklogApplicationTests {

	@Test
	void contextLoads() {
	}

}
