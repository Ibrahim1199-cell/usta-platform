package com.usta.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;

import javax.sql.DataSource;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public DataSource getDataSource() {
		return DataSourceBuilder.create()
				.driverClassName("org.postgresql.Driver")
				.url("jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:6543/postgres?prepareThreshold=0&sslmode=require")
				.username("postgres.jbtazoqcjvrcnnedgxne")
				.password("ibrahimsupabase20082026")
				.build();
	}
}