import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { store_name, surveyor_name, items } = body;

    // 1. วนลูปเพื่อแมปรายการสินค้าให้แสดงผลทีละ SKU ในรูปแบบ Flex Box
    const skuContents = items.flatMap((item: any, index: number) => {
      // ตรวจสอบราคาแสดงผล (หากมีราคาโปรโมชั่นให้ใส่เครื่องหมายกำกับ)
      const hasPromo = item.promo_price && parseFloat(item.promo_price) > 0;
      const finalPriceText = hasPromo
        ? `${item.promo_price} ฿ (โปรฯ)`
        : `${item.price} ฿`;

      return [
        // บรรทัดที่ 1: ชื่อสินค้า และ ราคาขาย
        {
          type: "box",
          layout: "horizontal",
          margin: "md",
          contents: [
            {
              type: "text",
              text: `${index + 1}. ${item.pack_name || item.descriptions || "ไม่ระบุชื่อสินค้า"}`,
              weight: "bold",
              size: "sm",
              color: "#111111",
              flex: 4,
              wrap: true,
            },
            {
              type: "text",
              text: finalPriceText,
              weight: "bold",
              size: "sm",
              color: hasPromo ? "#DC3545" : "#0066C8",
              align: "end",
              flex: 2,
            },
          ],
        },
        // บรรทัดที่ 2: รหัสบาร์โค้ด, ค่า Off-Take และ ปุ่มกดลิงก์ดูรูปภาพหน้างาน
        {
          type: "box",
          layout: "horizontal",
          margin: "xs",
          contents: [
            // ฝั่งซ้าย: ข้อมูลสินค้าเชิงลึก
            {
              type: "box",
              layout: "vertical",
              flex: 4,
              contents: [
                {
                  type: "text",
                  text: `บาร์โค้ด: ${item.barcode || "-"}`,
                  size: "xs",
                  color: "#888888",
                },
                {
                  type: "text",
                  text: `📈 Off-Take: ${item.off_take || 0}`,
                  size: "xs",
                  color: "#28A745",
                  weight: "bold",
                },
              ],
            },
            // ฝั่งขวา: กลุ่มปุ่มกดเปิดดูรูปถ่ายแบบ Inline Text Action
            {
              type: "box",
              layout: "horizontal",
              flex: 3,
              spacing: "md",
              justifyContent: "flex-end",
              alignItems: "center",
              contents: [
                // ปุ่มดูรูปภาพป้ายราคา (จะแสดงขึ้นมาเมื่อพนักงานมีการถ่ายรูปส่งเข้ามาเท่านั้น)
                ...(item.price_tag_url
                  ? [
                      {
                        type: "text",
                        text: "🖼️ รูปป้าย",
                        size: "xs",
                        color: "#0066C8",
                        align: "end",
                        weight: "bold",
                        decoration: "underline",
                        action: {
                          type: "uri",
                          label: "ดูรูปป้าย",
                          uri: item.price_tag_url,
                        },
                      },
                    ]
                  : []),
                // ปุ่มดูรูปถ่ายหน้าชั้นวางสินค้า (จะแสดงขึ้นมาเมื่อพนักงานมีการถ่ายรูปส่งเข้ามาเท่านั้น)
                ...(item.shelf_view_url
                  ? [
                      {
                        type: "text",
                        text: "📸 รูปชั้น",
                        size: "xs",
                        color: "#0066C8",
                        align: "end",
                        weight: "bold",
                        decoration: "underline",
                        action: {
                          type: "uri",
                          label: "ดูรูปชั้น",
                          uri: item.shelf_view_url,
                        },
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
        // เส้นแบ่งบางๆ ระหว่างรายการสินค้าสไตล์มินิมอล
        {
          type: "separator",
          margin: "sm",
          color: "#F0F0F0",
        },
      ];
    });

    // 2. ประกอบโครงสร้างหลักของ Flex Message Payload เพื่อนำส่งเข้า LINE API
    const flexPayload = {
      type: "flex",
      altText: `🔔 รายงานราคาตลาด: ${store_name}`,
      contents: {
        type: "bubble",
        styles: {
          header: { backgroundColor: "#0066C8" },
        },
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "RVP MARKET INTELLIGENCE",
              color: "#FFFFFF",
              weight: "bold",
              size: "sm",
              tracking: "wide",
            },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: store_name,
              weight: "bold",
              size: "lg",
              color: "#111111",
            },
            {
              type: "text",
              text: `👤 ผู้รายงาน: ${surveyor_name}`,
              size: "xs",
              color: "#666666",
              margin: "xs",
            },
            {
              type: "text",
              text: `📦 รายงานข้อมูลราคารวม: ${items.length} SKUs`,
              size: "xs",
              color: "#666666",
            },
            {
              type: "separator",
              margin: "md",
              color: "#DDDDDD",
            },
            ...skuContents,
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "⚡ สรุปข้อมูลอัตโนมัติโดยระบบวิเคราะห์ข้อมูล RVP",
              size: "xs",
              color: "#AAAAAA",
              align: "center",
            },
          ],
        },
      },
    };

    // 3. ยิงโครงสร้างข้อมูล Flex Payload ไปยัง LINE Messaging API ด้วย Token ของท่าน
    const lineResponse = await fetch(
      "https://api.line.me/v2/bot/message/push",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          to: process.env.LINE_TARGET_GROUP_OR_USER_ID, // ID กลุ่มหรือแชทปลายทาง
          messages: [flexPayload],
        }),
      },
    );

    if (!lineResponse.ok) {
      const errText = await lineResponse.text();
      console.error("LINE API Error:", errText);
      return NextResponse.json({ error: "ส่งไลน์ไม่สำเร็จ" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
