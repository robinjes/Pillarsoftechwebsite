'use client'

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Fredoka, Space_Grotesk } from 'next/font/google';
import { Check, Copy, Code, HelpCircle } from 'lucide-react';

const fredoka = Fredoka({ subsets: ['latin'] });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

const APPS_SCRIPT_CODE = `
function doPost(e) {
  // Parse incoming JSON data from the registration form
  var data = JSON.parse(e.postData.contents);
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // If spreadsheet is empty, set headers matching the data keys
  if (sheet.getLastRow() === 0) {
    var headers = Object.keys(data);
    sheet.appendRow(headers);
    
    // Style headers
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#f3f4f6");
  }
  
  // Append response row
  var rowData = Object.values(data);
  sheet.appendRow(rowData);
  
  // Return success response to the website
  return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper to handle preflight CORS requests from Next.js
function doOptions(e) {
  return ContentService.createTextOutput("OK");
}
`.trim();

export default function AdminSettings() {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className={`${fredoka.className} text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500`}>
          Webhook Instructions
        </h1>
        <p className={`${spaceGrotesk.className} text-blue-200 mt-2`}>
          Learn how to generate a custom Apps Script webhook for your event registration forms to receive submissions directly into a Google Sheet.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-white/10 p-6 md:p-8 rounded-3xl mt-8"
      >
        <h2 className={`${fredoka.className} text-2xl font-bold text-white mb-6 flex items-center`}>
          <Code className="w-6 h-6 mr-3 text-accent" />
          Setup Instructions
        </h2>

        <div className={`space-y-6 ${spaceGrotesk.className} text-blue-100`}>
          <div className="flex gap-4 p-4 bg-blue-900/20 border border-blue-800/50 rounded-xl items-start">
            <HelpCircle className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-blue-200">How to link your Google Sheet (Repeat for each form):</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-100/80">
                <li>Create a new <a href="https://sheets.new" target="_blank" className="text-accent hover:underline font-bold">Google Sheet</a></li>
                <li>In the top menu, click <strong>Extensions {'>'} Apps Script</strong></li>
                <li>Delete any code in the editor and paste the script below</li>
                <li>Click <strong>Deploy {'>'} New deployment</strong></li>
                <li>Select type: <strong>Web app</strong></li>
                <li>Execute as: <strong>Me</strong></li>
                <li>Who has access: <strong>Anyone</strong></li>
                <li>Click <strong>Deploy</strong>, authorize access (click Advanced {'>'} Go to script if warned)</li>
                <li>Copy the <strong>Web app URL</strong> and paste it into the Webhook URL field for that specific event's form!</li>
              </ol>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute right-4 top-4">
              <button
                onClick={copyCode}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center text-sm font-semibold border border-white/10"
              >
                {copied ? <Check className="w-4 h-4 mr-2 text-emerald-400" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
            <pre className="p-6 bg-[#0d1117] text-slate-300 rounded-xl border border-white/10 overflow-x-auto text-sm leading-relaxed shadow-inner">
              <code>{APPS_SCRIPT_CODE}</code>
            </pre>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
