import SwiftUI

/// Shared neon visual language for the SwiftUI overlays.
enum Theme {
    static let neon = Color(red: 0.18, green: 0.96, blue: 0.84)
    static let danger = Color(red: 1.0, green: 0.28, blue: 0.45)
    static let gold = Color(red: 1.0, green: 0.82, blue: 0.2)
    static let bg = Color(red: 0.05, green: 0.06, blue: 0.12)

    static let title = Font.system(size: 48, weight: .heavy, design: .rounded)
    static let big = Font.system(size: 34, weight: .bold, design: .rounded)
    static let label = Font.system(size: 18, weight: .semibold, design: .rounded)
}

/// A glowing, tappable neon button used across the menus.
struct NeonButton: View {
    let title: String
    var systemImage: String? = nil
    var tint: Color = Theme.neon
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                if let systemImage { Image(systemName: systemImage) }
                Text(title)
            }
            .font(Theme.label)
            .foregroundColor(.black)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(tint)
                    .shadow(color: tint.opacity(0.7), radius: 12)
            )
        }
        .buttonStyle(.plain)
    }
}
