---
name: aipix-api
description: >-
  Comprehensive reference for the AIPix AI Video Management System (VMS) and Integration API.
  Use this skill to look up general capabilities, authentication patterns, endpoint structures, 
  and best practices when integrating with the AIPix AI camera platform.
---

# AIPix AI Platform Integration API

## Overview

AIPix is a B2B/B2G platform designed for telecom operators and ISPs to launch white-label Video Surveillance as a Service (VSaaS) solutions. The **Integration API** connects the VMS with external systems like billing platforms, CRM, and telecom provisioning systems.

## API Structure & Authentication

The AIPIX API relies on REST principles and standard JSON formats.

1. **Public API Requests:** 
   - Used for the Integration API.
   - Do not require authentication headers in some specific setups, but access is typically controlled via IP address whitelisting.

2. **Private API Requests:**
   - Used for VMS Admin and VMS Client APIs.
   - Require a **Bearer token** for authentication.
   - Token is obtained by sending a `POST` request to the `/token` endpoint.

## Key Capabilities & Endpoints

The API is organized into several functional domains:

### 1. Cameras & Streams
- **Camera Management:** Add, delete, and retrieve information about cameras.
- **Video Streams:** Create, manage, and retrieve video stream URLs (e.g., VMS playback).
- **Analytic Events:** Retrieve face recognition, attendance, and trigger events via `/api/v1/analytic-case/events`.

### 2. Device Administration
- Management of hardware devices, including intercoms, Bridge devices, and cameras running Agent software.

### 3. Hierarchical Management (Tree)
- Construct and manage a tree-like organizational structure for addresses and their associated camera endpoints.

### 4. User Management
- External systems can create, edit, and delete video surveillance user accounts via API.

## Pagination

All bulk data retrieval endpoints (such as fetching events or employee records) support standard pagination parameters:
- `page`: The page index (starts at 1).
- `per_page`: The number of items to return per page (e.g., 100).
- Example: `?per_page=100&page=2`

## Documentation Access

Detailed technical documentation and endpoint schemas are hosted on the [AIPix Documentation Portal](https://aipix.ai/) under the **Developer Guide** or **Integration API** sections. Analytics API documentation is often provided specifically upon request to enterprise customers.

## Best Practices

- **Check Release Notes:** AIPix regularly updates its Control Center API. Always check for version compatibility.
- **Paginate Your Fetches:** When retrieving lists (e.g., daily events), always use a `while` loop over the `page` parameter until an empty array is returned.
- **Distinguish Products:** Make sure you are using documentation for the **Aipix VSaaS platform** (aipix.ai) and not unrelated image processing SDKs with similar names.
