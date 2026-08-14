# EventFlow

## Backend leaning Full-stack Homework

# Scenario

Snapsoft has been contacted by EventFlow, a new platform helping organizers promote events and sell tickets worldwide. They need a system capable of serving multiple frontends and supporting dynamic event pages.

To test and promote the platform, Snapsoft is planning to host its next AWS meetup through EventFlow.

# Your task

Build a backend system that supports a flexible, template-driven structure for rendering and managing event pages. Event content should be defined through nested, reusable layout components that the backend stores, organizes, and serves to clients.

Initialize the system using the provided AWS meetup sample data, and make sure it can support a variety of events with different layouts and access levels.

# Minimum requirements

- **Backend**

  - Define a schema to store and render flexible event page layouts composed of these building blocks:

    - Section *(flex container)*

    - Heading *(h1, h2, etc.)*

    - Paragraph

    - SessionSchedule

      - SessionCard

    - SpeakerList

      - SpeakerCard

  - Build endpoints for:

    - Authentication (signup/login with username/password - no social login or third-party auth)

    - Accessing individual event pages

      - Some events should be marked as VIP-only and viewable only by signed-in VIP users

    - Event registration

    - Listing events

    - *(Optional)* Event editing - only editable by organizer account

- **Frontend**

  - Implement a basic UI that lists current events on the homepage.

# Submission Requirements

Your solution must include:

- Source code

- A **README.md** with:

  - Setup instructions (install, build, run)

  - Stack and library choices - and why you chose them

  - Key decisions, trade-offs, and suggestions for future improvements

# Mock Data

You'll find event.json, layout.json, and speakers.json attached. These represent the expected complexity. You may adapt the structure, but keep the level of detail consistent.

# Contact Us

If any questions arise, feel free to get in touch with us.
