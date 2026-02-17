# Timeline and Note Lifecycle Enhancements

This document outlines the future vision for the Sazanami timeline and note lifecycle, as described by the project owner. The goal is to create a seamless flow from quick thoughts to structured knowledge.

## Core Philosophy

The user experience is designed around a four-stage process: Brain Dump, Triage, Elaboration, and Export.

### 1. 【脳直】 (Brain Dump) - Instant Capture

- **Goal:** To lower the barrier for capturing thoughts to the absolute minimum.
- **Action:** The user instantly jots down any idea, task, or fragment of emotion onto the **Timeline**. There's no need to worry about formatting or organization at this stage. The timeline serves as the primary "inbox".

### 2. 【整理】 (Triage) - Organization

- **Goal:** To organize and manage the captured thoughts.
- **Action:** The user reviews the timeline and decides the value of each item.
  - **Thoughts worth cultivating** are sent to the **Box** (the main note environment) via an intuitive action (e.g., a right swipe).
  - **Completed or unnecessary thoughts** are sent to the **Archive** via a different intuitive action (e.g., a left swipe).
- This keeps the timeline clean and focused.

### 3. 【思考】 (Elaboration) - Deepening Knowledge

- **Goal:** To develop and connect ideas.
- **Action:** In the **Box**, the user connects related notes using **WikiLinks**, adds more content, and edits existing notes. The **pin** feature provides quick access to important knowledge.

### 4. 【出力】 (Export) - Sharing Knowledge

- **Goal:** To export mature knowledge to the outside world.
- **Action:** The user copies or exports a well-developed note as **Markdown**. This allows Sazanami to function as a "hub" for thought that connects with other tools like blogs, rather than being a silo.

## Required Future Enhancements

Based on the philosophy above, the following features need to be implemented to complete the vision:

1.  **Interactive Timeline Items:**
    - The current timeline is a log of _events_. It should be changed to display the _notes_ themselves in a compact "card" format.
    - Each card on the timeline should be actionable.

2.  **Triage Actions from Timeline:**
    - Implement functionality to move a note directly from the timeline to the "Box" or the "Archive".
    - The desired user experience is a **swipe gesture** (e.g., swipe right for Box, swipe left for Archive).
    - As an alternative or initial implementation, action buttons on each timeline card could be used ("Move to Box", "Archive").

3.  **Completed Tasks:**
    - The user mentioned using checkboxes for tasks (e.g., `[ ] 帰りに牛乳を買う`).
    - When a task is checked off, it should be easily archivable from the timeline. The logic for what happens when a checkbox is ticked needs to be defined (e.g., does it automatically get archived after a certain period?).

By implementing these enhancements, the Sazanami app will more closely match the intended user flow and philosophy.
