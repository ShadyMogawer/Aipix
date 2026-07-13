/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Proxy endpoint to retrieve events from AIPix API securely
  // Fetches ALL pages so the full day's data (morning through night) is returned.
  app.get("/api/aipix/events", async (req, res) => {
    try {
      const { from, to, similarity_form = "80" } = req.query;

      const fromDate = typeof from === "string" ? from : "2026-07-05";
      const toDate   = typeof to   === "string" ? to   : "2026-07-05";

      // Helper: ensure ISO datetime string ends with Z
      const formatToAIPixDate = (dateStr: string, timeSuffix: string) => {
        if (dateStr.includes("T") && dateStr.endsWith("Z")) return dateStr;
        if (dateStr.includes("T")) return dateStr.replace(/[-+]\d{2}:\d{2}$/, "Z").replace(/\+\d{4}$/, "Z");
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return `${dateStr}T${timeSuffix}Z`;
        return dateStr;
      };

      const fromFormatted = formatToAIPixDate(fromDate, "00:00:00");
      const toFormatted   = formatToAIPixDate(toDate,   "23:59:59");

      const token = process.env.AIPIX_BEARER_TOKEN ||
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNDczZWE4ZTMzMDcxNDczOTFiNDQwYTVjOWYxZThhNjhhNWNmNzAzMTRlN2QyNGY2YjQwZWFkNWU3MmNjM2MyZGVmZjJlZDVlYWMwMzQyNTMiLCJpYXQiOjE3ODM5MTI1MTguMjk5NzgzLCJuYmYiOjE3ODM5MTI1MTguMjk5Nzg4LCJleHAiOjMzMzcyMzU3MzE4LjI2Njk2NCwic3ViIjoiNiIsInNjb3BlcyI6W119.FGjfr73PckImAsYIam3e8l_SSjwuZr3PPT9QYdNOI3hr09M2twPppWFtyaPI5Fz65Zbyrr5AXHR_XY_bXBWtPwdz6ew8yca_sppbYZ7OthVPcLrTPgZyqsI-H7sGc_cQMER8PuN9eVD97Q-_qe0tvXOnEjb-i3c99om_DHKUn1TwH2ftXzhR3om4LVvFysIh3s8Sj8ApQXIaPyh5Xdk7KP0AzrsA8oO1UIKeK7eNzMJpy7hhUqBwe-xwsHa3sHni-jw4WrRp4WhwVIJaq-viAnrxpdTZrQ0EuQXuqWalmnVllvNEB2j9KYYAn6t41Dvuurz0r47bApIU-MG3ULDTYY1dLZiSGJuycl4VkznVtq0Z1ugwMX1nf65tsSHWg7coB8YE9xgdvhyvds5SXqw0axUDudTRWkS9SrNin_RIXpCeKBu-mX6YBGISS5NjkWFgUR_CFCGMsXcuiHCMYJ2O5loGqYwhxcDhkv2SmQ9hMGt9PQPt3BzADpVbLyyKJUTZnulrOegG1QKzhiPhhqS2_CvHBsjuUjoBBGraQAyQG937yL9_iGpo7LmfSMKWE6B2cacXVSfCLEtCw_aPo2fmBSm56k3g3TpeQI44ZevrtdfBEO7vykr8ldbXHv7PE8RqGKU-nRajm7mZ2uctSKvIOHeTNCKgNgYkFmw20N5jq2U";

      // ── Paginated fetch: collect ALL events for the date range ─────────────
      // Use dir=asc so we get morning events first; loop until an empty page.
      const PER_PAGE   = 100;
      const MAX_PAGES  = 50; // safety cap = 5 000 events max
      const allEvents: any[] = [];
      let page = 1;

      console.log(`[AIPix Proxy] Starting paginated fetch: ${fromFormatted} → ${toFormatted}`);

      while (page <= MAX_PAGES) {
        const pageUrl = new URL("https://aipix.gsd-me.com/api/v1/analytic-case/events");
        pageUrl.searchParams.append("from", fromFormatted);
        pageUrl.searchParams.append("to",   toFormatted);
        pageUrl.searchParams.append("dir",  "asc");          // oldest → newest
        pageUrl.searchParams.append("per_page", String(PER_PAGE));
        pageUrl.searchParams.append("page",     String(page));
        pageUrl.searchParams.append("similarity_form", typeof similarity_form === "string" ? similarity_form : "80");

        const pageRes = await fetch(pageUrl.toString(), {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (!pageRes.ok) {
          console.error(`[AIPix Proxy] Page ${page} returned HTTP ${pageRes.status}`);
          break;
        }

        const pageData = await pageRes.json();
        // Support both { data: [...] } and { data: { data: [...] } } response shapes
        const pageEvents: any[] = Array.isArray(pageData.data)
          ? pageData.data
          : (Array.isArray(pageData.data?.data) ? pageData.data.data : []);

        if (pageEvents.length === 0) {
          console.log(`[AIPix Proxy] Page ${page} empty — all events fetched.`);
          break;
        }

        allEvents.push(...pageEvents);
        console.log(`[AIPix Proxy] Page ${page}: +${pageEvents.length} events (total so far: ${allEvents.length})`);

        if (pageEvents.length < PER_PAGE) {
          // Last partial page — no more data
          break;
        }
        page++;
      }

      console.log(`[AIPix Proxy] Fetched ${allEvents.length} total events across ${page} page(s).`);

      return res.json({
        success: true,
        data: { data: allEvents, total: allEvents.length }
      });

    } catch (error: any) {
      console.error("[AIPix Proxy] Exception during fetch proxy:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error in AIPix Proxy"
      });
    }
  });


  // Proxy endpoint to retrieve all registered employees from AIPix API securely
  app.get("/api/aipix/employees", async (req, res) => {
    try {
      const token = process.env.AIPIX_BEARER_TOKEN || 
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiNDczZWE4ZTMzMDcxNDczOTFiNDQwYTVjOWYxZThhNjhhNWNmNzAzMTRlN2QyNGY2YjQwZWFkNWU3MmNjM2MyZGVmZjJlZDVlYWMwMzQyNTMiLCJpYXQiOjE3ODM5MTI1MTguMjk5NzgzLCJuYmYiOjE3ODM5MTI1MTguMjk5Nzg4LCJleHAiOjMzMzcyMzU3MzE4LjI2Njk2NCwic3ViIjoiNiIsInNjb3BlcyI6W119.FGjfr73PckImAsYIam3e8l_SSjwuZr3PPT9QYdNOI3hr09M2twPppWFtyaPI5Fz65Zbyrr5AXHR_XY_bXBWtPwdz6ew8yca_sppbYZ7OthVPcLrTPgZyqsI-H7sGc_cQMER8PuN9eVD97Q-_qe0tvXOnEjb-i3c99om_DHKUn1TwH2ftXzhR3om4LVvFysIh3s8Sj8ApQXIaPyh5Xdk7KP0AzrsA8oO1UIKeK7eNzMJpy7hhUqBwe-xwsHa3sHni-jw4WrRp4WhwVIJaq-viAnrxpdTZrQ0EuQXuqWalmnVllvNEB2j9KYYAn6t41Dvuurz0r47bApIU-MG3ULDTYY1dLZiSGJuycl4VkznVtq0Z1ugwMX1nf65tsSHWg7coB8YE9xgdvhyvds5SXqw0axUDudTRWkS9SrNin_RIXpCeKBu-mX6YBGISS5NjkWFgUR_CFCGMsXcuiHCMYJ2O5loGqYwhxcDhkv2SmQ9hMGt9PQPt3BzADpVbLyyKJUTZnulrOegG1QKzhiPhhqS2_CvHBsjuUjoBBGraQAyQG937yL9_iGpo7LmfSMKWE6B2cacXVSfCLEtCw_aPo2fmBSm56k3g3TpeQI44ZevrtdfBEO7vykr8ldbXHv7PE8RqGKU-nRajm7mZ2uctSKvIOHeTNCKgNgYkFmw20N5jq2U";

      console.log(`[AIPix Proxy] Fetching events from page 1 to 5 to extract all employees...`);

      const pagePromises = [1, 2, 3, 4, 5].map(async (page) => {
        const pageUrl = new URL("https://aipix.gsd-me.com/api/v1/analytic-case/events");
        pageUrl.searchParams.append("from", "2025-01-01T00:00:00Z");
        pageUrl.searchParams.append("to", "2026-12-31T23:59:59Z");
        pageUrl.searchParams.append("dir", "desc");
        pageUrl.searchParams.append("per_page", "100");
        pageUrl.searchParams.append("page", String(page));

        try {
          const response = await fetch(pageUrl.toString(), {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`
            }
          });
          if (!response.ok) return [];
          const responseData = await response.json();
          return Array.isArray(responseData.data) ? responseData.data : (responseData.data?.data || []);
        } catch (e) {
          console.error(`[AIPix Proxy] Failed fetching page ${page}:`, e);
          return [];
        }
      });

      const pagesResults = await Promise.all(pagePromises);
      const events = pagesResults.flat();

      const uniqueEmployeesMap = new Map<string, any>();

      for (const event of events) {
        if (event.analytic_file && event.analytic_file.id) {
          const empId = String(event.analytic_file.id);
          if (!uniqueEmployeesMap.has(empId)) {
            uniqueEmployeesMap.set(empId, event.analytic_file);
          }
        }
      }

      const employeesList = Array.from(uniqueEmployeesMap.values());
      console.log(`[AIPix Proxy] Successfully extracted ${employeesList.length} unique employees from ${events.length} events across 5 pages.`);

      return res.json({
        success: true,
        data: employeesList
      });
    } catch (error: any) {
      console.error("[AIPix Proxy] Exception during fetch proxy:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal Server Error in AIPix Proxy"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Loaded Vite dev middleware");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Serving compiled production files from /dist");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Core Service active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
