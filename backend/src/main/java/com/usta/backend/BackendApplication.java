package com.usta.backend;

import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import javax.sql.DataSource;

@SpringBootApplication
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public DataSource getDataSource() {
		HikariDataSource ds = new HikariDataSource();
		ds.setDriverClassName("org.postgresql.Driver");
		ds.setJdbcUrl("jdbc:postgresql://aws-1-eu-west-1.pooler.supabase.com:5432/postgres");
		ds.setUsername("postgres.jbtazoqcjvrcnnedgxne");
		ds.setPassword("ibrahimsupabase20082026");
		ds.setMaximumPoolSize(3);
		return ds;
	}
}