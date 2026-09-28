'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Eye,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  AlertTriangle,
  FileCode,
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import Alert from './Alert';
import api from '../lib/api';

export default function ResumeViewerModal({
  isOpen,
  onClose,
  applicationId,
  resumeId,
  candidateName = 'Candidate',
  jobTitle = '',
  defaultFilename = 'resume.pdf',
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewUrl, setViewUrl] = useState(null);
  const [remoteUrl, setRemoteUrl] = useState(null);
  const [isWordDoc, setIsWordDoc] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [detectedFilename, setDetectedFilename] = useState(defaultFilename);
  const [iframeError, setIframeError] = useState(false);

  const blobUrlRef = useRef(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  const cleanupBlobUrl = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  };

  const handleModalClose = () => {
    cleanupBlobUrl();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupBlobUrl();
      setLoading(true);
      setError(null);
      setViewUrl(null);
      setRemoteUrl(null);
      setIsWordDoc(false);
      setZoom(1);
      setIframeError(false);
      return;
    }

    let isMounted = true;

    async function loadResume() {
      setLoading(true);
      setError(null);
      setIframeError(false);

      if (!applicationId && !resumeId) {
        if (isMounted) {
          setError('Resume not available for this candidate.');
          setLoading(false);
        }
        return;
      }

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          throw new Error('Authentication required. Please log in again.');
        }

        const endpoint = applicationId
          ? `/applications/${applicationId}/resume/view`
          : `/resumes/${resumeId}/view`;

        const fullUrl = `${backendUrl}/api${endpoint}?token=${encodeURIComponent(token)}`;
        setRemoteUrl(fullUrl);

        // Fetch resume binary data through authenticated endpoint
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!isMounted) return;

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Forbidden: You are not authorized to view this candidate\'s resume.');
          } else if (response.status === 404) {
            let msg = 'Resume not available for this candidate.';
            try {
              const errData = await response.json();
              if (errData?.message) msg = errData.message;
            } catch {}
            throw new Error(msg);
          } else {
            let errorMsg = `Unable to load resume (HTTP ${response.status})`;
            try {
              const errData = await response.json();
              if (errData?.message) errorMsg = errData.message;
            } catch {}
            throw new Error(errorMsg);
          }
        }

        const contentType = response.headers.get('content-type') || '';
        const disposition = response.headers.get('content-disposition') || '';

        // Extract filename from disposition if present
        let fn = defaultFilename;
        if (disposition.includes('filename=')) {
          const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
          if (match && match[1]) {
            fn = match[1].replace(/['"]/g, '').trim();
          }
        }
        setDetectedFilename(fn);

        // Detect if file is DOC / DOCX
        const isDoc =
          contentType.includes('word') ||
          contentType.includes('msword') ||
          fn.toLowerCase().endsWith('.doc') ||
          fn.toLowerCase().endsWith('.docx');

        setIsWordDoc(isDoc);

        if (isDoc) {
          setViewUrl(fullUrl);
        } else {
          // Convert binary stream to a same-origin Blob URL for reliable inline rendering
          const blob = await response.blob();
          const pdfBlob = new Blob([blob], { type: 'application/pdf' });
          cleanupBlobUrl();
          const objectUrl = URL.createObjectURL(pdfBlob);
          blobUrlRef.current = objectUrl;
          setViewUrl(objectUrl);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[ResumeViewerModal] Load error:', err);
          setError(err.message || 'The resume file is unavailable or could not be loaded.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadResume();

    return () => {
      isMounted = false;
      cleanupBlobUrl();
    };
  }, [isOpen, applicationId, resumeId, backendUrl, defaultFilename]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.6));
  const handleResetZoom = () => setZoom(1);

  const handleOpenNewTab = () => {
    const targetUrl = remoteUrl || viewUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dlEndpoint = applicationId
        ? `/applications/${applicationId}/resume/download`
        : `/resumes/${resumeId}/download`;
      await api.download(dlEndpoint, detectedFilename);
    } catch (err) {
      console.error('Download error from viewer:', err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      id="resume-viewer-modal"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/80 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100/70 text-blue-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                Resume: {candidateName}
                {isWordDoc && (
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-lg">
                    Word DOCX
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500">
                {jobTitle ? `Application for: ${jobTitle}` : 'Candidate Submitted Resume'}{' '}
                • <span className="font-mono text-[11px]">{detectedFilename}</span>
              </p>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!loading && !error && !isWordDoc && (
              <div className="hidden sm:flex items-center bg-white border border-slate-200 rounded-xl p-0.5 shadow-sm text-xs">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 py-1 font-semibold text-slate-700 text-[11px] select-none min-w-[48px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 border-l border-slate-100 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {!loading && !error && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                title="Open resume in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Tab</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || loading || !!error}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Download offline copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{downloading ? 'Downloading...' : 'Download'}</span>
            </button>

            <button
              type="button"
              onClick={handleModalClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 bg-slate-100/60 p-3 sm:p-4 overflow-auto flex flex-col items-center justify-center">
          {loading && (
            <div className="py-20 text-center">
              <LoadingSpinner text="Rendering candidate resume..." />
            </div>
          )}

          {error && !loading && (
            <div className="max-w-lg w-full bg-white p-6 rounded-2xl border border-red-100 shadow-md text-center space-y-3">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Resume Cannot Be Loaded</h4>
              <p className="text-xs text-slate-600">{error}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          )}

          {!loading && !error && isWordDoc && (
            <div className="max-w-xl w-full bg-white p-8 rounded-3xl border border-blue-100 shadow-lg text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
                <FileCode className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Microsoft Word Document Format</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Candidate file: <span className="font-mono text-slate-700">{detectedFilename}</span>
                </p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                Web browsers do not support direct inline viewing for binary Word documents (.docx / .doc).
                You can download the original file to review it in Microsoft Word, Google Docs, or your preferred office suite.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : 'Download Document to View'}
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Open
                </button>
              </div>
            </div>
          )}

          {!loading && !error && !isWordDoc && iframeError && (
            <div className="max-w-lg w-full bg-white p-6 rounded-2xl border border-amber-100 shadow-md text-center space-y-3">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Preview Could Not Render</h4>
              <p className="text-xs text-slate-600">The browser built-in PDF renderer was unable to display this document inline.</p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenNewTab}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" /> Open in New Tab
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          )}

          {!loading && !error && !isWordDoc && !iframeError && viewUrl && (
            <div
              className="w-full h-full flex items-start justify-center overflow-auto transition-transform duration-150"
              style={{
                transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                transformOrigin: 'top center',
              }}
            >
              <iframe
                src={viewUrl}
                title={`Resume - ${candidateName}`}
                onError={() => setIframeError(true)}
                className="w-full h-full min-h-[680px] bg-white rounded-2xl shadow-inner border border-slate-200"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
