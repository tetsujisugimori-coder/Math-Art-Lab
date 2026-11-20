# Stage AP 第4工程B：C1/C2 12か月費用比較（仮定に基づく試算、正式見積ではない）

**2026-11-19 JST。費用比較の共通条件を設定し、低8h/月・中80h/月・連続24h/日で12か月の部分費用を試算。契約見積、ライセンス費、機材購入額を確定したものではない。C1最安/C2最安の判定はHOLD、P3-AP4-01は実額・ライセンス未確認につきOPEN。**

## 1. 比較対象・除外境界

- C1は新デスクトップを仮想化ホスト、現行ギャラリアをRの候補とする。両端末は実配備未実施。新デスクトップを一般開発のため購入する場合、全額をStage AP専用追加費用に二重計上せず、**追加費用**と**共有設備費の配賦**を別表示する。
- C2はAzure Japan EastのWindows VM（例：Standard_D2as_v5、x64、2vCPU、8GiB）を**単価比較の代表仮定**に使い、Rはギャラリア常時待機と仮定する。**Windows 11クライアントVMの提供権利/資格は未確認**であり、価格例の「Windows VM」をWindows 11 clientの適法な実行構成と混同しない。
- 両構成ともguestの利用ライセンスの確認、R独立性・VM最小STOP権限・独立観測と保全の実現は未解決。価格差を物理安全PASSにしない。
- [Loading Museum PR #88](https://github.com/tetsujisugimori-coder/Loading-museum/pull/88)の運用に倣い、費用試算PASS／証拠監査／物理安全／本番試験許可は別判定。両repoのC1/C2識別子を同一視しない。

### 同条件の見積に使う要件

| 項目 | 比較条件 |
|---|---|
| guest性能 | C1の設計例は4 vCPU・8～12 GB。C2の現行試算は2 vCPU・8 GiB。同条件の見積では4 vCPUと合意したメモリ・ディスク要件を両方で満たす候補を比較する。C2の4 vCPU候補例は `Standard_D4as_v5`（16 GiB）。SKU採用と試験性能は未確認。[MicrosoftのSKU仕様](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dasv5-series) |
| guest OS・利用資格 | Windows 11クライアントの版・用途・実行権を固定し、C1のローカル仮想実行権とC2の対象Azureオファー・契約での資格をそれぞれ確認する。[AzureのWindowsクライアントイメージ](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/client-images) |
| 実行時間・固定費 | 8h/月・80h/月・連続の3条件を維持し、起動から料金停止までの時間、ストレージ・ログ保持、Rの稼働と障害対策、税・ライセンスを同じ前提で見積もる。 |

3条件の算式は再レビューで再計算と一致した。下記の2 vCPU料金は既存の算数例として掲載し、構成を合わせた見積の単価・金額は `NOT_QUOTED / COST_ACCEPTANCE=HOLD` とする。

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


## 7. 仮置き予算シナリオ（ライセンス・R追加費用を含む、**仮想額**）

前節の電力・クラウド部分計だけでは、所有者が求める「ライセンス・Rの追加費用を含む12か月総費用」の比較に足りないため、**全項目を仮置きした感度分析**を別掲する。以下の金額は**店舗見積・Microsoft利用許諾・Azure公式請求値ではなく、比較式の挙動を見るために自由に置いた予算パラメーター**である。正式見積状態は `NOT_QUOTED` のまま。

仮置きした追加費用（12か月、円、税込/税抜条件も未固定）：

| 仮定費用項目 | C1（仮定） | C2（仮定） |
|---|---:|---:|
| ホストOS適合・アップグレード予備費 | 20,000 | 0（クラウド料金のOS含有未確認） |
| guest利用資格・追加ライセンス予備費 | 30,000 | 30,000（クラウドVMのOS込み料金と二重計上する可能性があるため、契約確定時に調整） |
| R独立給電・制限管理経路などの予備費 | 30,000 | 30,000 |
| 追加SSD／保守予備費 | 20,000 | 24,000（IP・転送・ログ・保守等の予備費、前節の仮ディスク月額1,500円とは別） |
| **上記追加費用合計** | **100,000** | **84,000** |
| 新デスクトップのStage APへの機材費配賦 | 0（既存の一般開発購入計画に増分がない仮定）または150,000（試算用の追加配賦仮定） | 0（クラウド端末調達なしの仮定） |

**重要：guest Windows clientとクラウドWindows VMの商品条件・ライセンスは未確認であるため、予備費を足せば法的な利用資格が成立するわけではない。** Azure Windows Server込み料金に同じライセンス費を追加請求されるとは限らず、対象guest OSが違えばC1/C2比較自体をやり直す。RのUPSやネットワーク独立性も仮定予備費で達成できるとは主張しない。

| 年間稼働 | C1（機材費追加配賦0の仮定） | C1（機材費追加配賦15万円の仮定） | C2（前節部分計＋仮置き予備費） |
|---|---:|---:|---:|
| 低（96h/年） | 112,533円 | 262,533円 | 112,603円 |
| 中（960h/年） | 114,952円 | 264,952円 | 139,041円 |
| 連続（8760h/年） | 136,792円 | 286,792円 | 377,721円 |

**この表の価格順位は一切採用判定に使わない。** 正式TCOはライセンス条項・実構成・機材の実増分・課金条件・運用頻度・共通故障対策を固定した後にのみ見積可能。具体的な見積書、Azure Retail PricesのSKUメーター、見積日時、料金単価/税と契約資格が入手できない場合、`COST_ACCEPTANCE=HOLD / NOT_QUOTED` を維持する。
