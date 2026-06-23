"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Swal from "sweetalert2";
import {
  Calendar,
  User,
  Clock,
  DollarSign,
  Search,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Image,
  Save,
  Loader2,
} from "lucide-react";

export default function AdminReportPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [issavingExpense, setIsSavingExpense] = useState<string | null>(null);

  // สเตทสำหรับกรอกค่าเดินทางชั่วคราวในหน้าจอ
  const [expenseInputs, setExpenseInputs] = useState<{ [key: string]: string }>(
    {},
  );

  const [searchDate, setSearchDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchUser, setSearchUser] = useState("");

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      let query = supabase.from("employee_expense_report").select("*");

      if (searchDate) query = query.eq("work_date", searchDate);
      if (searchUser) query = query.ilike("display_name", `%${searchUser}%`);

      const { data, error } = await query.order("display_name", {
        ascending: true,
      });
      if (error) throw error;

      setReports(data || []);

      // แมปค่าใช้จ่ายเดิมลงใน Input State
      const inputs: { [key: string]: string } = {};
      data?.forEach((r: any) => {
        const key = `${r.username}_${r.store_id}_${r.work_date}`;
        inputs[key] = r.travel_expense?.toString() || "0";
      });
      setExpenseInputs(inputs);
    } catch (err) {
      console.error("Error fetching report:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [searchDate]);

  // 🟢 ฟังก์ชันบันทึกค่าเดินทางโดยหัวหน้า (KOE)
  const handleUpdateExpense = async (
    username: string,
    storeId: number,
    workDate: string,
  ) => {
    const key = `${username}_${storeId}_${workDate}`;
    const amount = parseFloat(expenseInputs[key] || "0");

    if (isNaN(amount) || amount < 0) {
      return Swal.fire({
        icon: "warning",
        title: "กรุณากรอกจำนวนเงินให้ถูกต้อง",
      });
    }

    try {
      setIsSavingExpense(key);

      // อัปเดตค่าเดินทางลงในตารางหลัก attendance_logs ทุก Log ของร้านนั้นในวันนั้น
      const { error } = await supabase
        .from("attendance_logs")
        .update({ travel_expense: amount })
        .eq("username", username)
        .eq("store_id", storeId)
        .gte("created_at", `${workDate}T00:00:00`)
        .lte("created_at", `${workDate}T23:59:59`);

      if (error) throw error;

      Swal.fire({
        icon: "success",
        title: "บันทึกค่าเดินทางสำเร็จ",
        position: "top-end",
        toast: true,
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: err.message });
    } finally {
      setIsSavingExpense(null);
    }
  };

  const handleExportCSV = () => {
    if (reports.length === 0) return;
    const headers = [
      "วันที่,รหัสพนักงาน,ชื่อพนักงาน,รหัสร้าน,ชื่อร้านค้า,เวลาเข้า,เวลาออก,ชั่วโมงทำงาน,ค่าเดินทาง(KOE)\n",
    ];
    const rows = reports.map((r) => {
      const key = `${r.username}_${r.store_id}_${r.work_date}`;
      const expense = expenseInputs[key] || "0";
      return `"${r.work_date}","${r.username}","${r.display_name}","${r.store_code}","${r.store_name}","${r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("th-TH") : "-"}","${r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("th-TH") : "-"}","${r.work_hours || 0}","${expense}"`;
    });

    const csvContent = "\uFEFF" + headers + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CallVisit_Report_${searchDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-xl font-black text-slate-800">
              Call Visit Documents & Attendance Summary
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              เอกสารตรวจสอบการเข้าเยี่ยมสาขา และอนุมัติค่าเดินทางโดยหัวหน้า
              (KOE)
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={fetchReportData}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCSV}
              disabled={reports.length === 0}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> เลือกวันที่ปฏิบัติงาน
            </label>
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> ค้นหาชื่อพนักงาน
            </label>
            <input
              type="text"
              placeholder="พิมพ์ชื่อพนักงาน..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1 flex items-end">
            <button
              onClick={fetchReportData}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              <Search className="w-4 h-4" /> ค้นหาข้อมูล
            </button>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">ข้อมูลพนักงาน / ร้านค้า</th>
                  <th className="p-4">เวลาปฏิบัติงาน</th>
                  <th className="p-4 text-center">
                    หลักฐานรูปถ่าย (Call Visit)
                  </th>
                  <th className="p-4 text-center">พิกัดดาวเทียม (GPS)</th>
                  <th className="p-4 text-right" style={{ width: "200px" }}>
                    <DollarSign className="w-3.5 h-3.5 inline" /> ค่าเดินทาง
                    (KOE)
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-50">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-slate-400 font-bold"
                    >
                      กำลังประมวลผลข้อมูลเอกสาร...
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-slate-400 font-bold"
                    >
                      📭 ไม่พบข้อมูล Call Visit ในวันที่เลือก
                    </td>
                  </tr>
                ) : (
                  reports.map((report, idx) => {
                    const inputKey = `${report.username}_${report.store_id}_${report.work_date}`;
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 transition-all"
                      >
                        {/* พนักงาน / ร้านค้า */}
                        <td className="p-4">
                          <p className="font-bold text-slate-800 text-[13px]">
                            {report.display_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {report.username} | {report.company_tag}
                          </p>
                          <div className="mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 inline-block">
                            <p className="font-bold text-blue-900 text-[11px]">
                              {report.store_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              Code: {report.store_code} | Area:{" "}
                              {report.store_area}
                            </p>
                          </div>
                        </td>

                        {/* เวลาเข้าออก */}
                        <td className="p-4 space-y-1.5">
                          <p className="text-blue-600 font-mono text-[11px] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                            In:{" "}
                            {report.check_in_time
                              ? new Date(
                                  report.check_in_time,
                                ).toLocaleTimeString("th-TH") + " น."
                              : "-"}
                          </p>
                          <p className="text-emerald-600 font-mono text-[11px] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            Out:{" "}
                            {report.check_out_time
                              ? new Date(
                                  report.check_out_time,
                                ).toLocaleTimeString("th-TH") + " น."
                              : "-"}
                          </p>
                          <p className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold inline-block font-mono">
                            รวม: {report.work_hours || 0} ชม.
                          </p>
                        </td>

                        {/* หลักฐานรูปถ่าย */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center items-center gap-3">
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold mb-1">
                                รูปเข้างาน
                              </p>
                              {report.check_in_image ? (
                                <a
                                  href={report.check_in_image}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block relative group"
                                >
                                  <img
                                    src={report.check_in_image}
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-all shadow-sm"
                                    alt="Check In"
                                  />
                                </a>
                              ) : (
                                <span className="text-slate-300 text-[10px]">
                                  ไม่มีรูป
                                </span>
                              )}
                            </div>
                            <div className="border-r border-slate-200 h-8"></div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold mb-1">
                                รูปออกงาน
                              </p>
                              {report.check_out_image ? (
                                <a
                                  href={report.check_out_image}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block relative group"
                                >
                                  <img
                                    src={report.check_out_image}
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 group-hover:scale-105 transition-all shadow-sm"
                                    alt="Check Out"
                                  />
                                </a>
                              ) : (
                                <span className="text-slate-300 text-[10px]">
                                  ไม่มีรูป
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* พิกัด GPS */}
                        <td className="p-4 text-center space-y-1.5">
                          {report.check_in_lat && report.check_in_lng ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${report.check_in_lat},${report.check_in_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-lg hover:bg-blue-100 transition-all font-mono"
                            >
                              <MapPin className="w-3 h-3 text-blue-500" /> GPS
                              In
                            </a>
                          ) : null}
                          <br />
                          {report.check_out_lat && report.check_out_lng ? (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${report.check_out_lat},${report.check_out_lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-all font-mono"
                            >
                              <MapPin className="w-3 h-3 text-emerald-500" />{" "}
                              GPS Out
                            </a>
                          ) : null}
                        </td>

                        {/* ช่องกรอกค่าเดินทาง (KOE) */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-slate-400 font-bold text-xs">
                              ฿
                            </span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={expenseInputs[inputKey] || ""}
                              onChange={(e) =>
                                setExpenseInputs({
                                  ...expenseInputs,
                                  [inputKey]: e.target.value,
                                })
                              }
                              className="w-24 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-right font-bold text-slate-800 text-xs outline-none focus:border-blue-500 focus:bg-white"
                            />
                            <button
                              onClick={() =>
                                handleUpdateExpense(
                                  report.username,
                                  report.store_id,
                                  report.work_date,
                                )
                              }
                              disabled={issavingExpense === inputKey}
                              className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                              title="บันทึกค่าเดินทาง"
                            >
                              {issavingExpense === inputKey ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
