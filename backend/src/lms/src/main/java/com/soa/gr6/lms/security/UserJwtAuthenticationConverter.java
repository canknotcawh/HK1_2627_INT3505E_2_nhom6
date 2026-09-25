package com.soa.gr6.lms.security;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;

import com.soa.gr6.lms.domain.User;
import com.soa.gr6.lms.exception.ApiException;
import com.soa.gr6.lms.service.identity.UserService;

public class UserJwtAuthenticationConverter implements Converter<Jwt, UsernamePasswordAuthenticationToken> {

    private final UserService userService;

    public UserJwtAuthenticationConverter(UserService userService) {
        this.userService = userService;
    }

    @Override
    public UsernamePasswordAuthenticationToken convert(Jwt jwt) {
        User user;
        try {
            user = userService.provision(jwt);
        } catch (ApiException e) {
            throw new InvalidBearerTokenException(e.getMessage());
        }

        if (!user.isActive()) {
            throw new DisabledException("account is suspended");
        }

        AuthenticatedUser principal = new AuthenticatedUser(user.getId(), user.getEmail(), user.getRole());
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
        return UsernamePasswordAuthenticationToken.authenticated(principal, jwt, authorities);
    }
}