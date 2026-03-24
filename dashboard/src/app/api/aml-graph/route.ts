import { BigQuery } from '@google-cloud/bigquery';
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const bq = new BigQuery();

// Force dynamic execution since BQ queries are always fresh
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const datasetId = 'aml_demo_ds';
    const projectId = process.env.NEXT_PUBLIC_GCP_PROJECT_ID || process.env.GCP_PROJECT_ID || 'raves-altostrat';
    
    // 1. Layering
    const qLayering = `
      GRAPH \`${projectId}.${datasetId}.aml_knowledge_graph\`
      MATCH (a:Account)-[t1:TRANSACTED]->(b:Account)-[t2:TRANSACTED]->(c:Account)-[t3:TRANSACTED]->(d:Account)
      WHERE t1.amount > 5000 AND t1.timestamp < t2.timestamp AND t2.timestamp < t3.timestamp
      RETURN TO_JSON(a) AS Account_A, TO_JSON(t1) AS Hop_1, TO_JSON(b) AS Account_B, 
             TO_JSON(t2) AS Hop_2, TO_JSON(c) AS Account_C, TO_JSON(t3) AS Hop_3, TO_JSON(d) AS Account_D LIMIT 3;
    `;

    // 2. Circular Assets
    const qCircular = `
      GRAPH \`${projectId}.${datasetId}.aml_knowledge_graph\`
      MATCH (a:Account)-[t1:TRANSACTED]->(b:Account)-[t2:TRANSACTED]->(c:Account)-[t3:TRANSACTED]->(a:Account)
      WHERE t1.timestamp < t2.timestamp AND t2.timestamp < t3.timestamp
      RETURN TO_JSON(a) AS Account_A, TO_JSON(t1) AS Hop_1, TO_JSON(b) AS Account_B, 
             TO_JSON(t2) AS Hop_2, TO_JSON(c) AS Account_C, TO_JSON(t3) AS Hop_3 LIMIT 3;
    `;

    // 3. Smurfing
    const qSmurfing = `
      GRAPH \`${projectId}.${datasetId}.aml_knowledge_graph\`
      MATCH (sender:Account)-[tx:TRANSACTED]->(target:Account)
      WHERE tx.amount > 9000 AND tx.amount < 10000
      RETURN TO_JSON(sender) AS Account_A, TO_JSON(tx) AS Hop_1, TO_JSON(target) AS Account_B LIMIT 5;
    `;

    // 4. UBO Risk Flag
    const qUBO = `
      GRAPH \`${projectId}.${datasetId}.aml_knowledge_graph\`
      MATCH (retail:Account)-[tx:TRANSACTED]->(shell:Account)<-[own:OWNS]-(ubo:Entity {risk_level: 'High Risk'})
      RETURN TO_JSON(retail) AS Account_A, TO_JSON(tx) AS Hop_1, TO_JSON(shell) AS Account_B, 
             TO_JSON(own) AS Hop_2, TO_JSON(ubo) AS Account_C LIMIT 3;
    `;

    const [rowsLayering] = await bq.query(qLayering);
    const [rowsCircular] = await bq.query(qCircular);
    const [rowsSmurfing] = await bq.query(qSmurfing);
    const [rowsUBO] = await bq.query(qUBO);

    const anomalies: any[] = [];
    const globalNodesMap = new Map();
    const globalLinks: any[] = [];

    const processRowIntoAnomaly = (type: string, row: any, typeMappings: any) => {
      const localNodesMap = new Map();
      const localLinks: any[] = [];

      const addNode = (nodeStr: string) => {
        if (!nodeStr) return null;
        const graphObj = JSON.parse(nodeStr);
        const node = graphObj.properties || {};
        const id = node.account_id || node.entity_id || 'Unknown';
        if (id !== 'Unknown') {
          const nodeObj = {
            id,
            group: node.account_type || node.risk_level || 'Unknown',
            val: 5
          };
          if (!localNodesMap.has(id)) localNodesMap.set(id, nodeObj);
          if (!globalNodesMap.has(id)) globalNodesMap.set(id, nodeObj);
        }
        return { id };
      };

      const addLink = (linkStr: string, source: any, target: any) => {
        if (!linkStr || !source || !target) return;
        const graphObj = JSON.parse(linkStr);
        const link = graphObj.properties || {};
        const linkObj = {
          source: source.id,
          target: target.id,
          amount: link.amount || 0,
          currency: link.currency || 'USD',
          timestamp: link.timestamp || new Date().toISOString(),
          label: link.amount ? `$${link.amount.toLocaleString()}` : (graphObj.labels?.[0] || 'LINK')
        };
        localLinks.push(linkObj);
        globalLinks.push(linkObj);
      };

      const nA = addNode(row.Account_A);
      const nB = addNode(row.Account_B);
      if (nA && nB && row.Hop_1) addLink(row.Hop_1, nA, nB);
      
      let nC, nD;
      if (row.Account_C) {
         nC = addNode(row.Account_C);
         if (nB && nC && row.Hop_2) addLink(row.Hop_2, nB, nC);
      }
      if (row.Account_D) {
         nD = addNode(row.Account_D);
         if (nC && nD && row.Hop_3) addLink(row.Hop_3, nC, nD);
      }

      const nodes = Array.from(localNodesMap.values());
      const links = localLinks;

      let heading = "";
      let summary = "";

      if (type === 'Multi-Hop Layering') {
         heading = "Layering Sequence Detected";
         summary = `A rapid 3-hop sequence detected originating from ${nodes[0]?.id || 'an account'}, concluding at ${nodes[nodes.length-1]?.id || 'a blind sink'}. The structure aims to obfuscate tracing limits.`;
      } else if (type === 'Circular Activity') {
         heading = "Circular Asset Transfer";
         summary = `Funds looped through intermediaries to return directly to ${nodes[0]?.id || 'the originating account'}. This topology indicates illicit commingling.`;
      } else if (type === 'Structuring & Smurfing') {
         heading = "Structuring into Sink Account";
         summary = `Sub-threshold payments ($9,000-$10,000) are funnelled from ${nodes[0]?.id} to avoid AML triggers. Immediate CTR compliance review required.`;
      } else if (type === 'UBO Risk Flag') {
         heading = "Hidden Beneficiary Match";
         summary = `A retail account sent funds to a shell corporation explicitly tied to ${nodes.find(n => n.group === 'High Risk')?.id || 'a High-Risk UBO'} via corporate ownership lines.`;
      }

      anomalies.push({
         id: `anomaly_${Math.random().toString(36).substr(2, 9)}`,
         type,
         inference: { heading, summary },
         nodes,
         links
      });
    };

    rowsLayering.forEach(row => processRowIntoAnomaly('Multi-Hop Layering', row, {}));
    rowsCircular.forEach(row => processRowIntoAnomaly('Circular Activity', row, {}));
    rowsSmurfing.forEach(row => processRowIntoAnomaly('Structuring & Smurfing', row, {}));
    rowsUBO.forEach(row => processRowIntoAnomaly('UBO Risk Flag', row, {}));

    const globalNodes = Array.from(globalNodesMap.values());

    let globalHeading = "Structural Graph Analysis Pending";
    let globalSummary = "Awaiting AI inference validation on graph topologies.";

    // Generate Inference using Gemini (via @google/genai)
    if (globalNodes.length > 0) {
        // Build Intelligent Fallback using the data directly
        const entitiesSample = globalNodes.map(n => n.id).slice(0, 3).join(', ');
        globalHeading = globalNodes.length > 6 ? "GQL: Syndicate Network Flagged" : "GQL: Layering & Structuring Alert";
        globalSummary = `Detected ${globalNodes.length} isolated entities engaging in ${globalLinks.length} suspicious transfers matching deep-graph signatures (Structuring, Layering, Circular Activity). Confirmed actors include ${entitiesSample}. Freezing workflows initiated.`;

        // Attempt GenAI
        try {
            const ai = new GoogleGenAI({ vertexai: { project: projectId, location: 'us-central1' } });
            // If GEMINI_API_KEY is natively present, use it for faster dev bypass
            if (process.env.GEMINI_API_KEY) {
                // @ts-ignore
                ai.vertexai = undefined; 
                // @ts-ignore
                ai.apiKey = process.env.GEMINI_API_KEY;
            }

            const prompt = `You are a strict AML compliance officer. Review this detected graph topology:
Nodes involved: ${globalNodes.map(n => n.id).join(', ')}.
Links (transfers): ${JSON.stringify(globalLinks)}.

Provide a highly concise, alarming 1-line heading characterizing this specific threat. Then provide a 2 sentence summary of exactly what occurred based on the node names and link transactions. Limit summary to 2 sentences.
Return EXACTLY as JSON in this format with no markdown wrappers:
{"heading": "text", "summary": "text"}
`;
            const response = await ai.models.generateContent({
               model: 'gemini-3.1-pro-preview',
               contents: prompt
            });
            
            const responseText = response.text || "{}";
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            const geminiObj = JSON.parse(cleanJson);
            if (geminiObj.heading) globalHeading = geminiObj.heading;
            if (geminiObj.summary) globalSummary = geminiObj.summary;
        } catch (geminiError) {
             console.error("Gemini inference skipped, using data-driven fallback.", geminiError.message || geminiError);
        }
    } else {
        globalHeading = "No Anomalies Found";
        globalSummary = "The graph engine did not detect any structural anomalies matching the layering topology logic in this time window.";
    }

    return NextResponse.json({
      data: {
        nodes: globalNodes,
        links: globalLinks,
        anomalies: anomalies,
        inference: {
            heading: globalHeading,
            summary: globalSummary
        }
      }
    });

  } catch (error: any) {
    console.error("API Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
