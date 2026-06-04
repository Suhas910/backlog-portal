package com.college.backlog.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Append-only audit record of an action taken on a registration.
 * Rows are never updated or deleted.
 */
@Entity
@Table(name = "registration_events")
public class RegistrationEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reg_id")
    private String regId;

    private String action;       // SUBMITTED | VERIFIED | REJECTED

    private String actor;        // student rollNo, or admin username

    @Column(name = "actor_role")
    private String actorRole;    // STUDENT | ADMIN | PRINCIPAL | HOD | DEPT_OFFICE

    private Instant timestamp;

    @Column(length = 500)
    private String note;

    public RegistrationEvent() {}

    public RegistrationEvent(String regId, String action, String actor, String actorRole, String note) {
        this.regId = regId;
        this.action = action;
        this.actor = actor;
        this.actorRole = actorRole;
        this.timestamp = Instant.now();
        this.note = note;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRegId() { return regId; }
    public void setRegId(String regId) { this.regId = regId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getActorRole() { return actorRole; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
