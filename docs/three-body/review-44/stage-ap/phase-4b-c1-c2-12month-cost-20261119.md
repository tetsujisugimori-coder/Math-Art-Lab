# Stage AP 第4工程B：C1/C2 12か月費用比較（仮定に基づく試算、正式見積ではない）

**2026-11-19 JST。費用比較の共通条件を設定し、低8h/月・中80h/月・連続24h/日で12か月の部分費用を試算。契約見積、ライセンス費、機材購入額を確定したものではない。C1最安/C2最安の判定はHOLD、P3-AP4-01は実額・ライセンス未確認につきOPEN。**

## 1. 比較対象・除外境界

- C1は新デスクトップを仮想化ホスト、現行ギャラリアをRの候補とする。両端末は実配備未実施。新デスクトップを一般開発のため購入する場合、全額をStage AP専用追加費用に二重計上せず、**追加費用**と**共有設備費の配賦**を別表示する。
- C2はAzure Japan EastのWindows VM（例：Standard_D2as_v5、x64、2vCPU、8GiB）を**単価比較の代表仮定**に使い、Rはギャラリア常時待機と仮定する。**Windows 11クライアントVMの提供権利/資格は未確認**であり、価格例の「Windows VM」をWindows 11 clientの適法な実行構成と混同しない。
- 両構成ともguestの利用ライセンスの確認、R独立性・VM最小STOP権限・独立観測と保全の実現は未解決。価格差を物理安全PASSにしない。
- [Loading Museum PR #88](https://github.com/tetsujisugimori-coder/Loading-museum/pull/88)の運用に倣い、費用試算PASS／証拠監査／物理安全／本番試験許可は別判定。両repoのC1/C2識別子を同一視しない。

## 2. 算式と共通の仮定（すべて未承認・推定値）

| 項目 | C1例 | C2例 |
|---|---|---|
| 評価期間 | 12か月 / 8,760時間 | 12か月 / 8,760時間 |
| 稼働 | 低：96h/年、中：960h/年、連続：8,760h/年 | 同左。**起動・停止移行による課金超過は未算入** |
| 電力単価 | **35円/kWh（比較専用仮定）** | Rのみ同じ仮定 |
| 常時待機電力 | ホスト待機15W＋R待機25W＝40W（仮定） | R待機25W（仮定） |
| 試験中の増分電力 | ホスト稼働の追加80W（仮定） | クラウド実電力は時間単価に含める |
| VM計算単価 | 機器購入費・ライセンスは別途 | **$0.204/h（参考観測値、公式未確定）** × **150円/USD（固定の試算係数、実勢FXではない）**＝30.60円/h |
| VMディスク固定費 | 電気代と別にSSD/保守を後日計上 | **1,500円/月（完全な仮置き額）** |
| 外部R | 既存ギャラリアを使用する想定（費用0円の確証ではない） | ギャラリアRを仮定。機材増強・UPS・ネットワークは別途 |

参考のWindows従量VM単価 $0.204/h は、Azure公開料金APIに基づくとする非公式の2026-10-26時点の集約サイトのJapan East D2as_v5 Windows料金に近い。**このセッションではMicrosoft公式Azure Retail Prices APIの当該メーター生応答を取得できていないため、最新公式見積として扱わない。** 公式にリージョン/SKU/OS/productName/meter/subscription/currency/taxを固定し、見積日時と生API結果を取得して更新する。
- 公式API仕様：https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- 二次参照（2026-10-26更新と記載）：https://cld2day.com/tools/azure-vm/standard_d2as_v5
- Windows VM課金：https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing

**計算式（年間、円）**
- C1電気代部分＝［(15W＋25W)×8,760h ＋ 80W×対象VM稼働h］÷1,000×35円/kWh。
- C2計算費部分＝年間VM課金h×0.204 USD/h×150円/USD。
- C2部分計＝VM計算費＋12か月×1,500円（仮ディスク費）＋25W×8,760h÷1,000×35円/kWh（ギャラリアRの待機電力）。
- **12か月総費用TCO＝各部分計＋追加機材・OS/guestライセンス・R/UPS・ストレージ/保守・IP/転送/ログ・税・実働管理・移行課金等。これらは未算定のため、以下の数字はTCOではない。**

## 3. 3シナリオの12か月比較（試算用部分計、円）

| シナリオ | 稼働時間 | C1電気代の部分計 | C2クラウド計算費のみ | C2（計算＋仮ディスク＋R電気）部分計 |
|---|---:|---:|---:|---:|
| 低稼働 | 8h/月（96h/年） | 12,533円 | 2,938円 | 28,603円 |
| 中稼働 | 80h/月（960h/年） | 14,952円 | 29,376円 | 55,041円 |
| 連続 | 730h/月（8,760h/年） | 36,792円 | 268,056円 | 293,721円 |

**重要：これは仮定の算数例であり、C1/C2の見積総額ではない。** C1はホストの購入/配賦、正規WindowsホストOS・guestライセンス、UPS/別通信、交換/保守を含まず、C2は外部Rの追加装備、実ディスク・IP/ログ・送信、起動停止の課金超過、税・ライセンス未確定。従って上表の安い側を採用理由として用いることは禁止する。

追加費用の感度：新デスクトップのStage AP用途に配賦する機材費が0円/10万円/20万円なら、C1の見かけの年間費用は上表にその額だけ加算される（ライセンスなど他の未計上費用はなお残る）。Rを実験時だけ起動して常時待機させないモデルも別途算定が必要だが、試験開始前のR有効性・独立停止保証を先に設計しなければ採用できない。

## 4. 額を確定するまでの未取得値

| ID | 未固定事項 | 次の比較・拒否条件 |
|---|---|---|
| COST-01 | C1新デスクトップ候補とWindowsホストOS、SLAT/メモリ/SSD | 実機specと購入見積、一般開発との費用配賦を分離 |
| COST-02 | C1 guest Windows版・仮想実行権・ライセンス | 正式Microsoft使用許諾条項/契約に照合。OEM hostライセンスを自動転用禁止 |
| COST-03 | C1の実電力・稼働形態・Rを常時起動できるか | ワット計等で予備計測するのは後日別承認。今回の15/25/80Wは仮定 |
| COST-04 | C1独立Rの給電・管理経路・UPS・制限STOP | 物理共通故障・必要機材を見積に含めないうちはTCO未確定 |
| COST-05 | C2 VMのリージョン/SKU/guestイメージとWindowsライセンス資格、停止方式 | 公式Retail Prices API原応答、OS productNameを固定。Windows Serverとclientの価格を混同しない |
| COST-06 | C2ディスク、IP、送信、snapshot、ログ、R実行環境、税 | 使用量・保持期間・課金条件を同一シナリオで確定 |
| COST-07 | StopとDeallocateの課金状態の違い | Stopped(Allocated)は計算課金継続、Deallocatedでは計算課金停止でも他の費用残存。STOPと安全証明は別 |
| COST-08 | C1/C2運用管理・障害時の人手 | R自身の故障と停止確認経路、手動runbookの人件費・応答保証は未測定 |
| COST-09 | C2の予算管理 | 予算アラートは支出を強制停止しない。課金上限の自動保証として扱わない |

## 5. 第4工程Bの費用判断と安全ゲート

**P3-AP4-01は文書上の3シナリオ・式・除外条件を補訂したが、実額・ライセンス・資産・税が未確認なのでOPEN、最終費用比較HOLD。** 第4工程Bは文書・モデル提出に限定し、差額でC1を採用しない。AzureのRBAC/非同期進捗読取・Rの独立性は[設計書のレビュー補訂](phase-4-c1-c2-construction-design-20261119.md)および[C1詳細設計](phase-4b-c1-detail-20261119.md)と別に安全評価する。

AK01 RECOVERY_GUARANTEE=NONE、AK02 PHYSICAL_SAFETY=UNKNOWN、IMPLEMENT_ONLY=NO、QUALIFICATION_RUN=BLOCKED。購入・配備・契約・課金・VM操作・原停止試験は未承認。PR #44/#46 Open/Draft、未マージ。

## 6. 出典（仕様と参考値を区別）

- Microsoft Hyper-V要件：https://learn.microsoft.com/ja-jp/windows-server/virtualization/hyper-v/host-hardware-requirements
- Windows 11 VM要件：https://learn.microsoft.com/ja-jp/windows/whats-new/windows-11-requirements
- Azure Retail Prices API：https://learn.microsoft.com/en-us/rest/api/cost-management/retail-prices/azure-retail-prices
- Azure VM課金と状態：https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing
- Azure非同期操作権限：https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/management/async-operations
- 参考料金（二次集約、要公式照合）：https://cld2day.com/tools/azure-vm/standard_d2as_v5
