import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { uploadBlobInChunks, submitSTTJob } from '../utils/speechApi';
import { patchJobName } from '../utils/api';

const UploadManagerContext = createContext(null);

let nextTaskId = 1;

export function UploadManagerProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const paramsRef = useRef(new Map()); // taskId -> params usados (para reintentar)

  const patchTask = useCallback((id, patch) => {
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const removeTask = useCallback((id) => {
    paramsRef.current.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const runUpload = useCallback(async (id, params) => {
    const { fileUri, jobId, uploadUrl, blobName, format, sampleRate, durationSeconds, locale, localeName, name } = params;

    patchTask(id, { status: 'uploading', errorMessage: null, progress: { blocks: 0, total: 1 } });

    try {
      const finalBlobUrl = await uploadBlobInChunks(uploadUrl, fileUri, (prog) => {
        patchTask(id, { progress: prog });
      });

      patchTask(id, { status: 'submitting' });
      await submitSTTJob({
        jobId, blobUrl: finalBlobUrl, blobName, format, sampleRate, durationSeconds, locale, localeName,
      });

      if (name) {
        await patchJobName(jobId, name).catch(() => {});
      }

      patchTask(id, { status: 'done' });
      setTimeout(() => removeTask(id), 2500);
    } catch (e) {
      patchTask(id, { status: 'error', errorMessage: e.message || 'No se pudo subir el audio.' });
    }
  }, [patchTask, removeTask]);

  const startUpload = useCallback((params) => {
    const id = `upload_${nextTaskId++}`;
    paramsRef.current.set(id, params);
    setTasks(prev => [...prev, {
      id,
      name: params.name || 'Grabación',
      status: 'uploading',
      progress: { blocks: 0, total: 1 },
      errorMessage: null,
    }]);
    runUpload(id, params);
    return id;
  }, [runUpload]);

  const retryUpload = useCallback((id) => {
    const params = paramsRef.current.get(id);
    if (!params) return;
    runUpload(id, params);
  }, [runUpload]);

  const dismissTask = useCallback((id) => {
    removeTask(id);
  }, [removeTask]);

  const value = useMemo(
    () => ({ tasks, startUpload, retryUpload, dismissTask }),
    [tasks, startUpload, retryUpload, dismissTask]
  );

  return (
    <UploadManagerContext.Provider value={value}>
      {children}
    </UploadManagerContext.Provider>
  );
}

export function useUploadManager() {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) {
    throw new Error('useUploadManager debe usarse dentro de UploadManagerProvider');
  }
  return ctx;
}
