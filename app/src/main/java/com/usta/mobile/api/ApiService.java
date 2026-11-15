package com.usta.mobile.api;

import com.usta.mobile.model.Order;
import com.usta.mobile.model.User;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface ApiService {

    @POST("api/register")
    Call<User> register(@Body User user);

    @POST("api/login")
    Call<User> login(@Body Map<String, String> credentials);

    @GET("api/masters")
    Call<List<User>> getMasters(@Query("category") String category);

    @POST("api/orders")
    Call<Order> createOrder(@Body Order order);

    @GET("api/orders/customer/{id}")
    Call<List<Order>> getCustomerOrders(@Path("id") Long customerId);

    @GET("api/orders/master/{id}")
    Call<List<Order>> getMasterOrders(@Path("id") Long masterId);

    @PUT("api/orders/{id}/status")
    Call<Order> updateOrderStatus(
            @Path("id") Long orderId,
            @Query("status") String status,
            @Query("price") Double price
    );

    @POST("api/orders/{id}/rate")
    Call<Order> rateOrder(
            @Path("id") Long orderId,
            @Query("rating") Integer rating,
            @Query("review") String review
    );
}