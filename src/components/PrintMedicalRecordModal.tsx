import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Printer, Stethoscope, HeartPulse, Layers, FileText } from 'lucide-react';
import { formatDateIndonesian, formatRupiah, calculateAsianBMI } from '../utils/formatters';

export const PrintMedicalRecordModal: React.FC = () => {
  const { isPrintModalOpen, closePrintModal, printingPatient, visits, settings } = useApp();

  if (!isPrintModalOpen || !printingPatient) return null;

  const patientVisits = visits
    .filter((v) => v.patientId === printingPatient.id)
    .sort((a, b) => a.date.localeCompare(b.date) || a.visitNumber - b.visitNumber);

  const bmiInfo = calculateAsianBMI(
    printingPatient.vitalSigns?.weight,
    printingPatient.vitalSigns?.height
  );

  const handlePrint = () => {
    window.print();
  };

  const hasTTV = !!(
    printingPatient.vitalSigns?.bloodPressure ||
    printingPatient.vitalSigns?.heartRate ||
    printingPatient.vitalSigns?.respiratoryRate ||
    printingPatient.vitalSigns?.spo2 ||
    printingPatient.vitalSigns?.temperature ||
    printingPatient.vitalSigns?.height ||
    printingPatient.vitalSigns?.weight ||
    printingPatient.vitalSigns?.bmi
  );

  const hasICF = !!(
    printingPatient.bodyFunction ||
    printingPatient.bodyStructure ||
    printingPatient.activityLimitation ||
    printingPatient.participationRestriction ||
    printingPatient.personalFactor ||
    printingPatient.environmentalFactor
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div
        id="print-medical-record-modal"
        className="w-full max-w-4xl bg-white dark:bg-[#001F3F]/40 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col print:max-h-none print:border-none print:shadow-none print:m-0 print:rounded-none print:bg-white print:text-black"
      >
        {/* Modal Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-[#001F3F] text-white print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-300" />
            <h3 className="font-bold text-sm text-white">
              Pratinjau Cetak Lembar Rekam Medis & ICF Fisioterapi
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={closePrintModal}
              className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto space-y-6 text-slate-900 dark:text-slate-100 print:text-black print:p-0 print:overflow-visible bg-white dark:bg-slate-950 print:bg-white">
          
          {/* Header Kop Surat */}
          <div className="border-b-2 border-slate-900 dark:border-slate-100 print:border-black pb-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-7 h-7 rounded bg-[#001F3F] text-white flex items-center justify-center font-black text-xs print:bg-black">
                B
              </div>
              <h1 className="text-xl font-black tracking-wider uppercase">
                {settings.clinicInfo?.name || 'B FISIO CLINIC & HOME CARE'}
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 print:text-slate-700">
              {settings.clinicInfo?.tagline || 'Layanan Fisioterapi Home Care & Klinik'} • Fisioterapis: {settings.defaultTherapist || 'Bintang'} • No. STR: {settings.clinicInfo?.strNumber || 'STR.Fisio.2024'}
            </p>
            <p className="text-[11px] text-slate-500 print:text-slate-600 mt-0.5">
              {settings.clinicInfo?.address || 'Jakarta, Indonesia'} • Telp/WA: {settings.clinicInfo?.phone || '0812-3456-7890'}
            </p>
          </div>

          <div className="text-center py-1">
            <h2 className="text-sm font-bold uppercase tracking-wider underline">
              LEMBAR REKAM MEDIS & ASESMEN FISIOTERAPI
            </h2>
          </div>

          {/* Demographic Information Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 dark:bg-slate-900/50 print:bg-slate-50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300">
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500 print:text-slate-600 block">Nama Pasien:</span>
                <strong className="text-sm text-slate-900 dark:text-white print:text-black">
                  {printingPatient.fullName}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">No. Rekam Medis (RM):</span>
                <strong className="font-mono text-blue-600 dark:text-blue-400 print:text-black">
                  {printingPatient.mrn}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">Usia / Jenis Kelamin:</span>
                <span>
                  {printingPatient.age} Tahun / {printingPatient.gender === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">No. Telepon / WA:</span>
                <span>{printingPatient.phone}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-slate-500 print:text-slate-600 block">Diagnosa Fisioterapi:</span>
                <strong className="text-slate-900 dark:text-white print:text-black">
                  {printingPatient.diagnosis || '-'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">Keluhan Utama:</span>
                <span>{printingPatient.mainComplaint || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">Alamat / Lokasi:</span>
                <span>{printingPatient.address || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 print:text-slate-600 block">Total Kunjungan:</span>
                <strong>{printingPatient.totalVisits} Kali Terapi</strong>
              </div>
            </div>
          </div>

          {/* Riwayat Penyakit Sekarang (RPS) */}
          {printingPatient.currentMedicalHistory && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs bg-slate-50/50 print:bg-white space-y-1">
              <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase tracking-wider block">
                Riwayat Penyakit Sekarang (RPS):
              </span>
              <p className="text-slate-700 dark:text-slate-300 print:text-black leading-relaxed">
                {printingPatient.currentMedicalHistory}
              </p>
            </div>
          )}

          {/* Tanda-Tanda Vital (TTV) & Antropometri (IMT) */}
          {hasTTV && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs bg-slate-50/50 print:bg-white space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 print:border-slate-300 pb-1.5">
                <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase tracking-wider flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-600 print:text-black" />
                  Tanda-Tanda Vital (TTV) & Antropometri
                </span>
                {bmiInfo.category && (
                  <span className="font-bold text-[11px] print:text-black">
                    Klasifikasi IMT: {bmiInfo.category} (Standar Asia)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 print:text-slate-600">Tekanan Darah: </span>
                  <strong>{printingPatient.vitalSigns?.bloodPressure || '-'} mmHg</strong>
                </div>
                <div>
                  <span className="text-slate-500 print:text-slate-600">Nadi: </span>
                  <strong>{printingPatient.vitalSigns?.heartRate || '-'} x/mnt</strong>
                </div>
                <div>
                  <span className="text-slate-500 print:text-slate-600">RR: </span>
                  <strong>{printingPatient.vitalSigns?.respiratoryRate || '-'} x/mnt</strong>
                </div>
                <div>
                  <span className="text-slate-500 print:text-slate-600">SpO2 / Suhu: </span>
                  <strong>
                    {printingPatient.vitalSigns?.spo2 ? `${printingPatient.vitalSigns.spo2}%` : '-'} / {printingPatient.vitalSigns?.temperature ? `${printingPatient.vitalSigns.temperature}°C` : '-'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 print:text-slate-600">Tinggi Badan: </span>
                  <strong>{printingPatient.vitalSigns?.height || '-'} cm</strong>
                </div>
                <div>
                  <span className="text-slate-500 print:text-slate-600">Berat Badan: </span>
                  <strong>{printingPatient.vitalSigns?.weight || '-'} kg</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 print:text-slate-600">Indeks Massa Tubuh (IMT): </span>
                  <strong>{bmiInfo.bmiFormatted} ({bmiInfo.category || '-'})</strong>
                </div>
              </div>
            </div>
          )}

          {/* Kerangka 6 Domain ICF */}
          {hasICF && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs bg-slate-50/50 print:bg-white space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase tracking-wider block border-b border-slate-200 print:border-slate-300 pb-1.5">
                Evaluasi Kerangka ICF (International Classification of Functioning)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {printingPatient.bodyFunction && (
                  <div>
                    <strong className="text-blue-700 print:text-black block">1. Body Function:</strong>
                    <span className="text-slate-700 print:text-black">{printingPatient.bodyFunction}</span>
                  </div>
                )}
                {printingPatient.bodyStructure && (
                  <div>
                    <strong className="text-blue-700 print:text-black block">2. Body Structure:</strong>
                    <span className="text-slate-700 print:text-black">{printingPatient.bodyStructure}</span>
                  </div>
                )}
                {printingPatient.activityLimitation && (
                  <div>
                    <strong className="text-blue-700 print:text-black block">3. Activity Limitation:</strong>
                    <span className="text-slate-700 print:text-black">{printingPatient.activityLimitation}</span>
                  </div>
                )}
                {printingPatient.participationRestriction && (
                  <div>
                    <strong className="text-blue-700 print:text-black block">4. Participation Restriction:</strong>
                    <span className="text-slate-700 print:text-black">{printingPatient.participationRestriction}</span>
                  </div>
                )}
                {printingPatient.personalFactor && (
                  <div>
                    <strong className="text-blue-700 print:text-black block">5. Personal Factor:</strong>
                    <span className="text-slate-700 print:text-black">{printingPatient.personalFactor}</span>
                  </div>
                )}
                {printingPatient.environmentalFactor && (
                  <div>
                    <strong className="text-blue-700 print:text-black block">6. Environmental Factor:</strong>
                    <span className="text-slate-700 print:text-black">{printingPatient.environmentalFactor}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Data Penunjang List (Google Drive Links & Ekspertise) */}
          {printingPatient.supportingDocs && printingPatient.supportingDocs.length > 0 && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs bg-slate-50/50 print:bg-white space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-200 print:text-black uppercase tracking-wider block border-b border-slate-200 print:border-slate-300 pb-1">
                Data Penunjang & Tautan Google Drive Ekspertise Medis
              </span>
              <ul className="list-disc list-inside space-y-1.5 pt-1">
                {printingPatient.supportingDocs.map((doc, idx) => (
                  <li key={doc.id || idx} className="leading-relaxed">
                    <strong>{doc.title || doc.name || 'Dokumen Penunjang'}</strong>
                    {doc.notes ? ` — Catatan: ${doc.notes}` : ''}
                    {doc.url && (
                      <span className="block pl-4 text-[11px] font-mono text-slate-500 print:text-slate-700">
                        Link: {doc.url}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Therapy Sessional Records */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 print:text-black">
              Catatan SOAP & Intervensi Kunjungan Terapi
            </h3>

            {patientVisits.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada catatan kunjungan terapi.</p>
            ) : (
              <div className="space-y-4">
                {patientVisits.map((v) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 print:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm">Kunjungan ke-{v.visitNumber}</strong>
                        <span className="text-slate-500">• {formatDateIndonesian(v.date)}</span>
                        <span className="text-slate-500">• {v.location}</span>
                      </div>
                      <div className="text-right">
                        <span>Fisioterapis: <strong>{v.therapist}</strong></span>
                      </div>
                    </div>

                    {/* Interventions */}
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">
                        Tindakan / Intervensi:{' '}
                      </span>
                      <span className="font-medium">{v.interventions.join(', ')}</span>
                    </div>

                    {/* SOAP block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 print:bg-slate-50">
                        <strong className="text-blue-600 print:text-black">S (Subjective): </strong>
                        <span>{v.soap.subjective || '-'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 print:bg-slate-50">
                        <strong className="text-indigo-600 print:text-black">O (Objective): </strong>
                        <span>{v.soap.objective || '-'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 print:bg-slate-50">
                        <strong className="text-purple-600 print:text-black">A (Assessment): </strong>
                        <span>{v.soap.assessment || '-'}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/40 print:bg-slate-50">
                        <strong className="text-emerald-600 print:text-black">P (Plan): </strong>
                        <span>{v.soap.plan || '-'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signature Footer */}
          <div className="pt-8 flex justify-between items-end text-xs print:pt-12">
            <div className="text-slate-500 print:text-slate-600">
              <p>Dicetak pada: {formatDateIndonesian(new Date().toISOString().split('T')[0])}</p>
              <p className="text-[10px]">Dokumen Rekam Medis Rahasia B Fisio App</p>
            </div>

            <div className="text-center w-48 space-y-12">
              <p className="font-semibold text-slate-800 dark:text-slate-200 print:text-black">
                Fisioterapis Pemeriksa,
              </p>
              <div className="border-b border-slate-400 print:border-black w-full" />
              <p className="font-bold text-slate-900 dark:text-white print:text-black">
                ( {settings.defaultTherapist || 'Bintang, S.Ft'} )
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
