package com.usta.mobile.util;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.usta.mobile.model.User;

public class SessionManager {
    private static final String PREF_NAME = "UstaMusteriSession";
    private static final String KEY_USER = "logged_user";

    private final SharedPreferences prefs;
    private final Gson gson;

    public SessionManager(Context context) {
        prefs = context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
        gson = new Gson();
    }

    public void saveUser(User user) {
        prefs.edit().putString(KEY_USER, gson.toJson(user)).apply();
    }

    public User getUser() {
        String json = prefs.getString(KEY_USER, null);
        if (json == null) return null;
        return gson.fromJson(json, User.class);
    }

    public void logout() {
        prefs.edit().remove(KEY_USER).apply();
    }
}