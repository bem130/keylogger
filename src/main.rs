// rdevクレートやその他標準ライブラリから必要なアイテムをインポートします.
use rdev::{listen, Event, EventType};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use lazy_static::lazy_static;

// 前回のキー押下時刻を保持するためのグローバルな可変変数を定義します.
lazy_static! {
    static ref LAST_KEY_EVENT: Mutex<Option<Instant>> = Mutex::new(None);
}

// 閾値の秒数を定義します.
const THRESHOLD_MILLI_SECS: u64 = 500; // 必要に応じてこの値（n秒）を変更してください.

/// キーイベントを処理するためのコールバック関数です.
fn callback(event: Event) {
    // イベントがキー押下イベントかどうかチェックします.
    if let EventType::KeyPress(key) = event.event_type {
        let now = Instant::now();
        let mut last_event = LAST_KEY_EVENT.lock().unwrap();
        if let Some(previous) = *last_event {
            let elapsed = now.duration_since(previous);
            if elapsed >= Duration::from_millis(THRESHOLD_MILLI_SECS) {
                // 前回のキー入力からn秒以上経過している場合、追加処理を実行します.
                println!(
                    "          {}ms以上経過しました。",
                    THRESHOLD_MILLI_SECS
                );
                // ここに追加処理のコードを記述します.
            }
        }
        // 前回のキー押下時刻を更新します.
        *last_event = Some(now);
        // 記録するキーの名前を決定する
        // それぞれ良い感じにやる
        let key_name = if let Some(name) = event.name {
                if format!("{:?}",&name).len()==3 {
                    match name.as_str() {
                        " " => "<Space>".to_string(),
                        _ => name,
                    }
                }
                else { format!("<{:?}>",key) }
            } else {
                match format!("<{:?}>",key).as_str() {
                    "<Unknown(244)>" => "<F>".to_string(),
                    "<Unknown(243)>" => "<H>".to_string(),
                    "<Unknown(93)>" => "<App>".to_string(),
                    _ => format!("<{:?}>",key),
                }
            };
        println!("{:?}",key_name);
    }
}

fn main() {
    // キーロガーが開始されたことをユーザーに通知します.
    println!("キーロガーを開始します。キーを押すとキーコードが表示されます...");
    // グローバルなキーボードイベントの監視を開始します.
    if let Err(error) = listen(callback) {
        // エラーが発生した場合はエラーメッセージを表示します.
        eprintln!("Error: {:?}", error);
    }
}