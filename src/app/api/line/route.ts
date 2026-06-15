/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const _supabaseBackend = createClient(
  "https://ryqabfpzjmtujfhslovm.supabase.co",
  "sb_publishable_RhkCtuGUUeaG9ScGoyS1vw_zCCDumnl",
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { store_name, surveyor_name, items } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "ไม่พบรายการสินค้า" }, { status: 400 });
    }

    const firstItem = items[0];
    let targetCustomerGroup = "";

    if (firstItem.company_type === "Company") {
      targetCustomerGroup = firstItem.company;
    } else {
      const { data: ourProduct } = await _supabaseBackend
        .from("products")
        .select("company")
        .eq("category", firstItem.category)
        .eq("company_type", "Company")
        .limit(1);
      targetCustomerGroup = ourProduct?.[0]?.company || "RVP";
    }

    const normalizedGroup = targetCustomerGroup.toLowerCase().trim();
    if (["riverpro", "rvp"].includes(normalizedGroup))
      targetCustomerGroup = "RVP";

    const { data: customerData, error: customerError } = await _supabaseBackend
      .from("customers")
      .select("line_token")
      .or(
        `name.eq.${targetCustomerGroup},company_name.eq.${targetCustomerGroup}`,
      )
      .maybeSingle();

    if (customerError || !customerData?.line_token) {
      return NextResponse.json(
        { error: `ไม่พบ Token ของ ${targetCustomerGroup}` },
        { status: 404 },
      );
    }

    const finalLineToken = customerData.line_token.trim();
    const chunkSize = 6;
    const itemChunks = [];
    for (let i = 0; i < items.length; i += chunkSize) {
      itemChunks.push(items.slice(i, i + chunkSize));
    }

    const carouselBubbles = itemChunks.map((chunk, chunkIdx) => {
      const flexContents: any[] = [];

      if (chunkIdx === 0) {
        flexContents.push(
          {
            type: "text",
            text: store_name || "ไม่ระบุชื่อร้านค้า",
            weight: "bold",
            size: "md",
            color: "#111111",
            wrap: true,
          },
          {
            type: "text",
            text: `👤 ผู้ส่ง: ${surveyor_name || "ไม่ระบุ"}`,
            size: "xxs",
            color: "#555555",
            margin: "sm",
          },
          {
            type: "text",
            text: `📦 (${items.length} SKUs)`,
            size: "xxs",
            color: "#777777",
            weight: "bold",
          },
          { type: "separator", margin: "md" },
        );
      } else {
        flexContents.push(
          {
            type: "text",
            text: `${store_name} (ต่อ)`,
            weight: "bold",
            size: "sm",
            color: "#555555",
          },
          { type: "separator", margin: "md" },
        );
      }

      chunk.forEach((item: any, index: number) => {
        const globalIndex = chunkIdx * chunkSize + index + 1;
        const displayPrice =
          item.promo_price && item.promo_price !== "0"
            ? `${item.price} ฿ -> ${item.promo_price} ฿`
            : `${item.price} ฿`;

        flexContents.push({
          type: "box",
          layout: "vertical",
          margin: "md",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                {
                  type: "text",
                  text: `${globalIndex}. ${item.descriptions}`,
                  size: "sm",
                  color: "#222222",
                  flex: 4,
                  wrap: true,
                },
                {
                  type: "text",
                  text: displayPrice,
                  size: "sm",
                  color: "#005bb7",
                  flex: 2,
                  align: "end",
                },
              ],
            },
          ],
        });
      });

      return {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#005bb7",
          paddingAll: "md",
          contents: [
            {
              type: "text",
              text: "RVP MARKET INTELLIGENCE",
              weight: "bold",
              size: "sm",
              color: "#ffffff",
            },
          ],
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "md",
          contents: flexContents,
        },
      };
    }); // ปิด map ตรงนี้ครับ

    await axios.post(
      "https://api.line.me/v2/bot/message/broadcast",
      {
        messages: [
          {
            type: "flex",
            altText: "รายงานราคา",
            contents: { type: "carousel", contents: carouselBubbles },
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${finalLineToken}`,
        },
      },
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error:", error.response?.data || error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
