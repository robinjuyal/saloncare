package com.salonqueue.websocket;

import com.salonqueue.entity.QueueEntry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
@Slf4j
public class QueueWebSocketController {
    
    private final SimpMessagingTemplate messagingTemplate;
    
    /**
     * Broadcast queue update to all subscribers of a specific salon
     */
    public void broadcastQueueUpdate(Long salonId, List<QueueEntry> queue) {
        log.info("Broadcasting queue update for salon: {}", salonId);
        messagingTemplate.convertAndSend("/topic/queue/" + salonId, queue);
    }
    
    /**
     * Handle queue subscription requests
     */
    @MessageMapping("/queue/{salonId}/subscribe")
    @SendTo("/topic/queue/{salonId}")
    public String handleQueueSubscription(@DestinationVariable Long salonId) {
        log.info("Client subscribed to queue updates for salon: {}", salonId);
        return "Subscribed to salon " + salonId + " queue updates";
    }
}
