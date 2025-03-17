// Import the required items from the rdev crate.
// rdevクレートから必要なアイテムをインポートします.
use rdev::{listen, Event, EventType};

/// Callback function to handle key events.
/// キーイベントを処理するためのコールバック関数です.
fn callback(event: Event) {
    // Check if the event is a key press event.
    // イベントがキー押下イベントかどうかをチェックします.
    if let EventType::KeyPress(_) = event.event_type {
        // Print the key code of the pressed key to standard output.
        // 押されたキーのキーコードを標準出力に表示します.
        println!("{:?}", event.name.unwrap_or_default());
    }
}

fn main() {
    // Inform the user that the keylogger has started.
    // キーロガーが開始されたことをユーザーに通知します.
    println!("Starting keylogger. Press keys to see their key codes...");

    // Begin listening to global keyboard events.
    // グローバルなキーボードイベントの監視を開始します.
    if let Err(error) = listen(callback) {
        // If an error occurs, print the error message.
        // エラーが発生した場合は、エラーメッセージを表示します.
        eprintln!("Error: {:?}", error);
    }
}
