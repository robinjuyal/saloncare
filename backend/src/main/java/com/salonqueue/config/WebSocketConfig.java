package com.salonqueue.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Was previously hardcoded directly below, ignoring this property
    // entirely — same issue as the REST CORS config in SecurityConfig.
    // That meant live queue updates (barber dashboard, customer live queue)
    // would silently fail to connect from any origin other than localhost,
    // no matter what spring.websocket.allowed-origins / ALLOWED_ORIGINS
    // was actually set to.
    @Value("${spring.websocket.allowed-origins}")
    private String allowedOriginsProperty;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(allowedOriginsProperty.split(","))
                .withSockJS();
    }
}
